import { RegexConstants } from "../constants";

const userSchema = {
  type: "object",
  properties: {
    body: {
      type: "object",
      properties: {
        email: {
          type: "string",
          format: "email",
          pattern: RegexConstants.EMAIL,
          errorMessage: {
            pattern: "Email should match the pattern " + RegexConstants.EMAIL,
          },
        },
        password: {
          type: "string",
          pattern: RegexConstants.PASSWORD,
          errorMessage: {
            pattern:
              "Password must be 3-20 characters long, include at least one uppercase letter, one lowercase letter, and one number.",
          },
        },
      },
      required: ["email", "password"],
      errorMessage: {
        required: {
          email: "Email is required.",
          password: "Password is required.",
        },
      },
    },
  },
  required: ["body"],
  errorMessage: "The request body is required.",
};

export default userSchema;
