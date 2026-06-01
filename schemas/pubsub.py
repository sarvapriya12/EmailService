from pydantic import BaseModel, ConfigDict, Field


class PubSubMessage(BaseModel):
	model_config = ConfigDict(populate_by_name=True, extra="ignore")

	data: str
	message_id: str = Field(alias="messageId")
	attributes: dict[str, str] = Field(default_factory=dict)


class PubSubPushRequest(BaseModel):
	model_config = ConfigDict(populate_by_name=True, extra="ignore")

	message: PubSubMessage
	subscription: str