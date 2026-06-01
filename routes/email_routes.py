from schemas.email import EmailRequest, EmailResponse, ExtractedData
from services.llm_router import LLMRouter
from services.classifier import EmailClassifier
from services.extractor import EmailExtractor
from services.email_generator import EmailGenerator
from services.gmail_service import GmailService
from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.post("/process-email")
def process_email(email_request: EmailRequest) -> EmailResponse:
    
    try:
        router_llm = LLMRouter()
        classifier = EmailClassifier(router=router_llm)
        extractor = EmailExtractor(router=router_llm)
        generator = EmailGenerator(router=router_llm)
        gmail = GmailService()
        #classify the email:
        classification = classifier.classify(
        subject=email_request.subject,
        body=email_request.body,
        )

        #extract data:
        extracted_raw = extractor.extract(
        subject=email_request.subject,
        body=email_request.body,
        )

        #generate reply:
        reply = generator.generate(
        subject=email_request.subject,
        body=email_request.body,
        extracted=extracted_raw,
        )   
        gmail_result = gmail.send_reply(
        to_email=email_request.sender_email,
        subject=reply["subject"],
        body=reply["body"],
        )

        return EmailResponse(
        category=classification["category"],
        extracted_data=ExtractedData(**extracted_raw),
        generated_reply_subject=reply["subject"],
        generated_reply_body=reply["body"],
        gmail_status=gmail_result["status"],
        success=True,
        )


    except RuntimeError:
        raise HTTPException(status_code=503, detail="All LLM providers failed")

    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")