export interface ErrorResponse {
  message: string;
  details?: string[];
}
export interface ValidationErrorDetails {
  message: string;
  instancePath: string;
  schemaPath: string;
  keyword: string;
  params: any;
}
