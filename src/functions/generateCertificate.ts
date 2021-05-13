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

    const templateHtml = handleTemplate({ id, name, grade })

    await generatePdf(templateHtml)

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

function handleTemplate({ id, name, grade }: IRequest) {

    const date = dayjs().toString()

    const medalPath = path.join(process.cwd(), "src", "template", "selo.png")

    const medal = fs.readFileSync(medalPath, "base64")

    const templatePath = path.join(process.cwd(), "src", "template", "certificate.hbs")

    const templateContent = fs.readFileSync(templatePath, "utf-8")

    const template = handlebars.compile(templateContent)

    const templateHtml = template({ date, medal, id, name, grade })

    return templateHtml
}

async function generatePdf(templateHtml: string) {

    const browser = await chromium.puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: true,
    })

    const page = await browser.newPage()

    await page.setContent(templateHtml)

    const pdf = await page.pdf({
        format: "a4",
        landscape: true,
        printBackground: true,
        preferCSSPageSize: true,
        path: process.env.IS_OFFLINE ? "certificate.pdf" : null
    })

    await browser.close()

    return pdf
}