from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..core.database import get_db
from ..crud import shortages as crud
from ..schemas import shortages as schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.ShortageReportResponse])
def get_active_reports(db: Session = Depends(get_db)):
    return crud.get_active_shortages(db)

@router.get("/all", response_model=List[schemas.ShortageReportResponse])
def get_all_reports(db: Session = Depends(get_db)):
    return crud.get_all_shortages(db)

@router.post("/", response_model=schemas.ShortageReportResponse, status_code=201)
def create_report(report: schemas.ShortageReportCreate, db: Session = Depends(get_db)):
    return crud.create_shortage_report(db, report)

@router.patch("/{report_id}/resolve", response_model=schemas.ShortageReportResponse)
def resolve_report(report_id: str, db: Session = Depends(get_db)):
    return crud.resolve_shortage_report(db, report_id)
