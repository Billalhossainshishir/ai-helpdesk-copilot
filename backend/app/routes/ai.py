from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas, services
from ..database import get_db
from ..knowledge import search_knowledge_base
from ..ml import predict_category
from ..priority import detect_priority

router = APIRouter(tags=["AI Assistance"])


@router.post("/predict-category", response_model=schemas.CategoryPrediction)
def category_prediction(payload: schemas.IssueText):
    return predict_category(payload.title, payload.description)


@router.post("/predict-priority", response_model=schemas.PriorityPrediction)
def priority_prediction(payload: schemas.IssueText):
    category = predict_category(payload.title, payload.description)["category"]
    return detect_priority(payload.title, payload.description, category)


@router.post("/suggest-solution", response_model=list[schemas.KnowledgeArticleRead])
def suggest_solution(payload: schemas.IssueText, db: Session = Depends(get_db)):
    category = predict_category(payload.title, payload.description)["category"]
    query = f"{payload.title} {payload.description} {payload.device_type or ''}"
    return search_knowledge_base(db, query, category=category, limit=3)


@router.post("/analyse-issue", response_model=schemas.IssueAnalysis)
def analyse_issue(payload: schemas.IssueText, db: Session = Depends(get_db)):
    return services.analyse_issue(db, payload.title, payload.description, payload.device_type)
