from pydantic import BaseModel, EmailStr, Field

class EmailRequest(BaseModel):
    sender_email: EmailStr = Field(..., description="The email address of the sender.")
    subject: str = Field(..., description="The subject line of the email.")
    body: str = Field(..., description="The main content of the email.")

class ExtractedData(BaseModel):
    customer_name: str | None = Field(None, description="The name of the customer.")
    issue: str | None = Field(None, description="A brief description of the issue.")
    priority: str  = Field('medium', description="The priority level of the issue (low, medium, high).")
    reference_number: str | None = Field(None, description="Any reference ID found in the email (order ID, patient ID, ticket number, case number, etc.)")
    product_name: str | None = Field(None, description="The name of the product related to the issue, if applicable.")
    raw_response: str|None = Field(None, description="The raw response from the extraction process.")


class EmailResponse(BaseModel):
    category: str = Field(..., description="The category of the email (e.g., 'complaint', 'inquiry', 'feedback').")
    extracted_data: ExtractedData | None = Field(None, description="The structured data extracted from the email.")
    generated_reply_body: str = Field(..., description="A generated reply to the email based on the extracted information.")
    generated_reply_subject: str = Field(..., description="A concise summary of the email content.")
    gmail_status: str = Field(..., description="Status of the Gmail send operation.")
    success: bool = Field(..., description="Indicates whether the entire pipeline completed successfully.")
