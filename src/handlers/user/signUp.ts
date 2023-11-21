import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import validator from "@middy/validator";
import { transpileSchema } from "@middy/validator/transpile";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

import { ApiError } from "../../errors";
import { middyMy } from "../../middlewares";
import { createToken } from "../../services";
import {
  ErrorResponse,
  IAuth,
  IUser,
  ValidationErrorDetails,
} from "../../types";
import userSchema from "../../validations/userSchema";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function signUp(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = event.body as unknown as IAuth;
    if (!body || !body.email || !body.password) {
      throw new ApiError("Email and password are required", 400);
    }
    const { email, password } = body;

    const userByEmailCmd = new QueryCommand({
      TableName: process.env.USERS_TABLE_NAME,
      IndexName: "EmailIndex",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": email.trim().toLowerCase(),
      },
    });

    const userByEmail = await docClient.send(userByEmailCmd);

    if (userByEmail.Items.length > 0) {
      throw new ApiError("Email already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 8);
    const date = new Date().toISOString();

    const newUser: IUser = {
      userId: uuid(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      createdAt: date,
      updatedAt: date,
    };
    const JWE = await createToken({
      userId: newUser.userId,
      email: newUser.email,
    });

    const commandUser = new PutCommand({
      TableName: process.env.USERS_TABLE_NAME,
      Item: newUser,
    });

    const JWEItem = {
      tokenId: uuid(),
      token: JWE,
      createdAt: date,
      userId: newUser.userId,
    };
    const commandToken = new PutCommand({
      TableName: process.env.TOKENS_TABLE_NAME,
      Item: JWEItem,
    });

    await docClient.send(commandUser);
    await docClient.send(commandToken);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "You are registered. Please login.",
        JWE,
      }),
    };
  } catch (e: any) {
    let responseMessage: ErrorResponse = {
      message: "An unexpected error occurred while processing your request.",
    };

    if ("details" in e && Array.isArray(e.details)) {
      responseMessage = {
        message: "There were validation errors with your request.",
        details: e.details.map(
          (detail: ValidationErrorDetails) => detail.message,
        ),
      };
    } else if ("message" in e) {
      responseMessage.message = e.message;
    }

    return {
      statusCode: e.statusCode || 500,
      body: JSON.stringify(responseMessage),
    };
  }
}

export const handler = middyMy(signUp).use(
  validator({
    eventSchema: transpileSchema(userSchema),
  }),
);
