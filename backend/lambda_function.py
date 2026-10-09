import base64
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Attr


logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ.get("TABLE_NAME", "SmartQueueMain")
DYNAMODB = boto3.resource("dynamodb")
TABLE = DYNAMODB.Table(TABLE_NAME)
ACTIONS = {"CALL_NEXT", "COMPLETE", "SKIP"}
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json",
}


def _json_default(value):
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _response(status_code, payload):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "isBase64Encoded": False,
        "body": json.dumps(payload, default=_json_default),
    }


def _method_and_path(event):
    request_context = event.get("requestContext") or {}
    http_context = request_context.get("http") or {}
    method = event.get("httpMethod") or http_context.get("method") or ""
    path = event.get("rawPath") or event.get("path") or ""
    return method.upper(), path.rstrip("/") or "/"


def _parse_body(event):
    body = event.get("body")
    if body is None:
        return {}
    if event.get("isBase64Encoded"):
        body = base64.b64decode(body).decode("utf-8")
    if isinstance(body, dict):
        return body
    if not isinstance(body, str):
        raise ValueError("Request body must be a JSON object")
    try:
        payload = json.loads(body)
    except json.JSONDecodeError as error:
        raise ValueError("Request body must contain valid JSON") from error
    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object")
    return payload


def _query_queue(service):
    paginator = TABLE.meta.client.get_paginator("query")
    pages = paginator.paginate(
        TableName=TABLE_NAME,
        KeyConditionExpression="#pk = :partition AND begins_with(#sk, :ticket_prefix)",
        ExpressionAttributeNames={"#pk": "pk", "#sk": "sk"},
        ExpressionAttributeValues={
            ":partition": f"QUEUE#{service}",
            ":ticket_prefix": "TICKET#",
        },
    )
    tickets = [ticket for page in pages for ticket in page.get("Items", [])]
    return sorted(tickets, key=lambda ticket: ticket.get("created_at", ""))


def _valid_service(payload):
    service = payload.get("service")
    if not isinstance(service, str) or not service.strip():
        raise ValueError("A non-empty service is required")
    return service.strip()


def _create_ticket(payload):
    name = payload.get("name")
    service = payload.get("service")
    if not isinstance(name, str) or not name.strip():
        raise ValueError("A non-empty name is required")
    if not isinstance(service, str) or not service.strip():
        raise ValueError("A non-empty service is required")

    service = service.strip()
    ticket = {
        "pk": f"QUEUE#{service}",
        "sk": f"TICKET#{uuid.uuid4()}",
        "queue_id": "",
        "name": name.strip(),
        "service": service,
        "status": "WAITING",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    ticket["queue_id"] = ticket["sk"].removeprefix("TICKET#")
    TABLE.put_item(Item=ticket)
    return ticket


def _update_status(ticket, expected_status, new_status):
    response = TABLE.update_item(
        Key={"pk": ticket["pk"], "sk": ticket["sk"]},
        UpdateExpression="SET #status = :new_status, #updated_at = :updated_at",
        ConditionExpression=Attr("status").eq(expected_status),
        ExpressionAttributeNames={
            "#status": "status",
            "#updated_at": "updated_at",
        },
        ExpressionAttributeValues={
            ":new_status": new_status,
            ":updated_at": datetime.now(timezone.utc).isoformat(),
        },
        ReturnValues="ALL_NEW",
    )
    return response["Attributes"]


def _call_next(service):
    conditional_error = TABLE.meta.client.exceptions.ConditionalCheckFailedException
    for attempt in range(2):
        tickets = _query_queue(service)
        serving = next((ticket for ticket in tickets if ticket.get("status") == "SERVING"), None)
        if serving:
            return _response(409, {
                "success": False,
                "message": "A ticket is already being served for this service.",
                "ticket": serving,
            })

        waiting = next((ticket for ticket in tickets if ticket.get("status") == "WAITING"), None)
        if waiting is None:
            return _response(409, {
                "success": False,
                "message": "There are no waiting tickets to call next.",
            })

        try:
            updated_ticket = _update_status(waiting, "WAITING", "SERVING")
            return _response(200, {
                "success": True,
                "message": "Next ticket is now being served.",
                "ticket": updated_ticket,
            })
        except conditional_error:
            if attempt == 1:
                break

    return _response(409, {
        "success": False,
        "message": "The queue changed during this action. Refresh and try again.",
    })


def _finish_serving_ticket(service, action):
    tickets = _query_queue(service)
    serving = next((ticket for ticket in tickets if ticket.get("status") == "SERVING"), None)
    if serving is None:
        return _response(409, {
            "success": False,
            "message": "There is no currently serving ticket for this service.",
        })

    new_status = "COMPLETED" if action == "COMPLETE" else "SKIPPED"
    try:
        updated_ticket = _update_status(serving, "SERVING", new_status)
    except TABLE.meta.client.exceptions.ConditionalCheckFailedException:
        return _response(409, {
            "success": False,
            "message": "The serving ticket changed during this action. Refresh and try again.",
        })

    return _response(200, {
        "success": True,
        "message": f"Ticket marked {new_status.lower()}.",
        "ticket": updated_ticket,
    })


def lambda_handler(event, context):
    try:
        method, path = _method_and_path(event or {})
        if method == "OPTIONS":
            return {"statusCode": 204, "headers": CORS_HEADERS, "isBase64Encoded": False, "body": ""}

        if method == "GET" and path == "/health":
            return _response(200, {"status": "ok"})

        if method == "GET" and path == "/queue":
            service = _valid_service((event.get("queryStringParameters") or {}))
            tickets = _query_queue(service)
            return _response(200, {
                "service": service,
                "count": len(tickets),
                "queue": tickets,
            })

        if method == "POST" and path == "/queue":
            ticket = _create_ticket(_parse_body(event))
            return _response(201, {
                "success": True,
                "message": "Ticket added to the queue.",
                "queue": ticket,
            })

        if method == "POST" and path == "/queue/action":
            payload = _parse_body(event)
            service = _valid_service(payload)
            action = payload.get("action")
            if not isinstance(action, str) or action.upper() not in ACTIONS:
                return _response(400, {
                    "success": False,
                    "message": "Action must be CALL_NEXT, COMPLETE, or SKIP.",
                })
            action = action.upper()
            if action == "CALL_NEXT":
                return _call_next(service)
            return _finish_serving_ticket(service, action)

        if path in {"/queue", "/queue/action", "/health"}:
            return _response(405, {
                "success": False,
                "message": f"Method {method or 'UNKNOWN'} is not allowed for {path}.",
            })

        return _response(404, {
            "success": False,
            "message": f"Route {path} was not found.",
        })
    except ValueError as error:
        return _response(400, {"success": False, "message": str(error)})
    except Exception:
        logger.exception("SmartQueue request failed")
        return _response(500, {
            "success": False,
            "message": "An internal error occurred while processing the request.",
        })
