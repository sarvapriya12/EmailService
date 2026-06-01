from fastapi import FastAPI

from routes.email_routes import router


def create_app() -> FastAPI:
	app = FastAPI(title="AI Email Support System", version="0.1.0")

	@app.get("/", tags=["system"])
	def root() -> dict[str, str]:
		return {"message": "AI Email Support System is running"}

	@app.get("/health", tags=["system"])
	def health() -> dict[str, str]:
		return {"status": "ok"}

	app.include_router(router)
	return app


app = create_app()