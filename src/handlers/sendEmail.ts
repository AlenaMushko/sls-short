import { SES } from "@aws-sdk/client-ses";
import { APIGatewayProxyResult, SQSEvent } from "aws-lambda";

import { ApiError } from "../errors";

const sesClient = new SES({ region: "eu-west-1" });

async function sendEmail(event: SQSEvent): Promise<APIGatewayProxyResult> {
  for (const record of event.Records) {
    const email = JSON.parse(record.body);
    const { subject, body, recipient } = email;

    const params = {
      Source: "myshko.alona@gmail.com",
      Destination: {
        ToAddresses: [recipient],
      },
      Message: {
        Body: {
          Text: {
            Charset: "UTF-8",
            Data: body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    };

    try {
      await sesClient.sendEmail(params);
    } catch (err) {
      throw new ApiError("Failed to send email", 500);
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email processing completed" }),
    };
  }
}

export const handler = sendEmail;
