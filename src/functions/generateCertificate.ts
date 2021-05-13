import { document } from "src/utils/DynamoDBClient"
import path from "path"
import fs from "fs"
import handlebars from "handlebars"
import dayjs from "dayjs"
import chromium from "chrome-aws-lambda"
import { S3 } from "aws-sdk"

interface IRequest {
    id: string,
    name: string,
    grade: string
}

export async function handle(event: { body: string }) {
    const { id, name, grade } = JSON.parse(event.body) as IRequest

    const result = await document.query({
        TableName: "students_certificates",
        KeyConditionExpression: "id=:id",
        ExpressionAttributeValues: {
            ":id": id
        }
    }).promise()

    if (result.Count > 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: "Certificate already exists."
            }),
            headers: {
                "Content-Type": "application/json"
            }
        }
    }

    await document.put({
        TableName: "students_certificates",
        Item: {
            id,
            name,
            grade
        }
    }).promise()

    return {
        statusCode: 201,
        body: JSON.stringify({
            message: "Certificate created"
        }),
        headers: {
            "Content-Type": "application/json"
        }
    }
}