import type { APIGatewayProxyResultV2 } from "aws-lambda";

export function ok(body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function created(body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode: 201,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function noContent(): APIGatewayProxyResultV2 {
  return { statusCode: 204 };
}

export function badRequest(message: string): APIGatewayProxyResultV2 {
  return {
    statusCode: 400,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  };
}

export function notFound(): APIGatewayProxyResultV2 {
  return {
    statusCode: 404,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Not found" }),
  };
}

export function unauthorized(): APIGatewayProxyResultV2 {
  return {
    statusCode: 401,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Unauthorized" }),
  };
}

export function internalError(err: unknown): APIGatewayProxyResultV2 {
  console.error(err);
  return {
    statusCode: 500,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Internal server error" }),
  };
}
