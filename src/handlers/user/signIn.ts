import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
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
import { ErrorResponse, IAuth, ValidationErrorDetails } from "../../types";
import userSchema from "../../validations/userSchema";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function signIn(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
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
    if (userByEmail.Items.length === 0) {
      throw new ApiError("Invalid email or password", 401);
    }

    const user = userByEmail.Items[0];
    const isMatched = await bcrypt.compare(password.trim(), user.password);
    if (!isMatched || user.email !== email.trim().toLowerCase()) {
      throw new ApiError("Invalid email or password", 401);
    }

    const JWE = await createToken({
      userId: user.userId,
      email: email.trim().toLowerCase(),
    });
    const date = new Date().toISOString();
    const newJWEItem = {
      tokenId: uuid(),
      token: JWE,
      createdAt: date,
      userId: user.userId,
    };

    const queryTokens = new QueryCommand({
      TableName: process.env.TOKENS_TABLE_NAME,
      IndexName: "UserIdIndex",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": user.userId,
      },
    });

    const oldTokens = await docClient.send(queryTokens);
    if (oldTokens.Items.length > 0) {
      for (const tokenItem of oldTokens.Items) {
        const deleteCmd = new DeleteCommand({
          TableName: process.env.TOKENS_TABLE_NAME,
          Key: {
            tokenId: tokenItem.tokenId,
          },
        });
        await docClient.send(deleteCmd);
      }
    }

    const commandToken = new PutCommand({
      TableName: process.env.TOKENS_TABLE_NAME,
      Item: newJWEItem,
    });
    await docClient.send(commandToken);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Sign in successful",
        token: newJWEItem,
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

export const handler = middyMy(signIn).use(
  validator({
    eventSchema: transpileSchema(userSchema),
  }),
);
