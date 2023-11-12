import { LinkConstants } from "../constants";

const linkSchema = {
  type: "object",
  properties: {
    body: {
      type: "object",
      properties: {
        originalLink: {
          type: "string",
          format: "uri",
          errorMessage: {
            pattern:
              "Link should be a valid URL and match the pattern " +
              LinkConstants.LINK,
          },
        },
        lifeTime: {
          type: "string",
          enum: ["AFTER_THE_LINK", "1_DAY", "3_DAYS", "7_DAYS"],
          default: "AFTER_THE_LINK",
          errorMessage: {
            enum: "Life time must be one of the following values: 'AFTER_THE_LINK', '1_DAY', '3_DAYS', '7_DAYS'.",
          },
        },
      },
      required: ["originalLink", "lifeTime"],
      errorMessage: {
        required: {
          originalLink: "Original link is required.",
          lifeTime: "Life time is required.",
        },
      },
    },
  },
  required: ["body"],
  errorMessage: {
    required: "The request body is required.",
  },
};

export default linkSchema;
