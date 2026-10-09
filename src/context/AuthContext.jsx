import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
} from "amazon-cognito-identity-js";

const AuthContext = createContext(null);

const getPool = () => {
  const region = import.meta.env.VITE_COGNITO_REGION || "ap-south-1";
  const poolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || "";
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || "";

  if (!poolId || !clientId) {
    return null;
  }

  return new CognitoUserPool({
    UserPoolId: poolId,
    ClientId: clientId,
    region,
  });
};

const mapCognitoError = (error) => {
  if (!error) {
    return "Unable to complete the request.";
  }

  const code = error.code || error.name || "";

  switch (code) {
    case "UserNotConfirmedException":
      return "Please verify your email.";
    case "NotAuthorizedException":
      return "Incorrect email or password.";
    case "UserNotFoundException":
      return "Account not found.";
    case "UsernameExistsException":
      return "An account with this email already exists.";
    case "InvalidPasswordException":
      return "Password does not meet the required requirements.";
    case "UserLambdaValidationException":
      return "The provided sign-in details could not be validated.";
    case "InvalidParameterException":
      return "Please check the form values and try again.";
    case "CodeMismatchException":
      return "Invalid verification code.";
    case "ExpiredCodeException":
      return "Verification code expired. Resend a new code and try again.";
    case "LimitExceededException":
    case "TooManyRequestsException":
      return "Too many attempts were made. Please wait a moment and try again.";
    default:
      return error.message || "Unable to complete the request.";
  }
};

const makeAuthError = (error) => {
  const authError = new Error(mapCognitoError(error));
  authError.code = error && (error.code || error.name) ? error.code || error.name : "UnknownError";
  return authError;
};

const isAlreadyConfirmed = (error) => {
  const message = (error && error.message ? error.message : "").toLowerCase();
  return message.includes("already confirmed") || message.includes("current status is confirmed");
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [configReady, setConfigReady] = useState(false);

  const refreshSession = async () => {
    const pool = getPool();

    if (!pool) {
      setConfigReady(false);
      setCurrentUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    setConfigReady(true);

    const user = pool.getCurrentUser();
    if (!user) {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    user.getSession((error, session) => {
      if (error || !session || !session.isValid()) {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setCurrentUser(user);
      setIsAuthenticated(true);
      setLoading(false);
    });
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const login = async ({ identifier, email, password }) => {
    const pool = getPool();
    if (!pool) {
      throw new Error(
        "A public Cognito app client is required. Configure VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID in your frontend environment."
      );
    }

    const username = (identifier || email || "").trim();
    if (!username) {
      throw new Error("Enter your Cognito email or username.");
    }

    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: pool,
      });

      cognitoUser.authenticateUser(
        new AuthenticationDetails({
          Username: username,
          Password: password,
        }),
        {
          onSuccess: () => {
            setCurrentUser(cognitoUser);
            setIsAuthenticated(true);
            resolve();
          },
          onFailure: (error) => {
            reject(makeAuthError(error));
          },
          newPasswordRequired: () => {
            reject(new Error("A new password is required before continuing."));
          },
        }
      );
    });
  };

  const register = async ({ fullName, email, password }) => {
    const pool = getPool();
    if (!pool) {
      throw new Error(
        "A public Cognito app client is required. Configure VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID in your frontend environment."
      );
    }

    return new Promise((resolve, reject) => {
      const attributeList = [
        new CognitoUserAttribute({
          Name: "name",
          Value: fullName,
        }),
        new CognitoUserAttribute({
          Name: "email",
          Value: email,
        }),
      ];

      pool.signUp(email, password, attributeList, null, (error, result) => {
        if (error) {
          reject(makeAuthError(error));
          return;
        }

        if (result && result.user) {
          resolve(result.user);
        } else {
          resolve();
        }
      });
    });
  };

  const confirmEmail = async ({ identifier, email, code }) => {
    const pool = getPool();
    if (!pool) {
      throw new Error("Cognito is not configured. Check the VITE_COGNITO_* environment variables.");
    }

    const username = (identifier || email || "").trim();
    if (!username || !code || !code.trim()) {
      throw new Error("Enter your registered email or username and verification code.");
    }

    const cognitoUser = new CognitoUser({ Username: username, Pool: pool });
    return new Promise((resolve, reject) => {
      cognitoUser.confirmRegistration(code.trim(), false, (error, result) => {
        if (error) {
          if (isAlreadyConfirmed(error)) {
            resolve({ alreadyConfirmed: true });
            return;
          }
          reject(makeAuthError(error));
          return;
        }
        resolve({ alreadyConfirmed: false, result });
      });
    });
  };

  const resendVerificationCode = async ({ identifier, email }) => {
    const pool = getPool();
    if (!pool) {
      throw new Error("Cognito is not configured. Check the VITE_COGNITO_* environment variables.");
    }

    const username = (identifier || email || "").trim();
    if (!username) {
      throw new Error("Enter your registered email or Cognito username first.");
    }

    const cognitoUser = new CognitoUser({ Username: username, Pool: pool });
    return new Promise((resolve, reject) => {
      cognitoUser.resendConfirmationCode((error, result) => {
        if (error) {
          if (isAlreadyConfirmed(error)) {
            resolve({ alreadyConfirmed: true });
            return;
          }
          reject(makeAuthError(error));
          return;
        }
        resolve({ alreadyConfirmed: false, result });
      });
    });
  };

  const logout = () => {
    const pool = getPool();
    if (!pool) {
      setCurrentUser(null);
      setIsAuthenticated(false);
      return;
    }

    const user = pool.getCurrentUser();
    if (user) {
      user.signOut();
    }

    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated,
      loading,
      configReady,
      login,
      register,
      confirmEmail,
      resendVerificationCode,
      logout,
      refreshSession,
    }),
    [currentUser, isAuthenticated, loading, configReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
