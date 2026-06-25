from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from ..models import models
from ..schemas import shortages as schemas
from .base import commit_and_refresh

def get_active_shortages(db: Session):
    reports = db.query(
        models.ShortageReport.id,
        models.ShortageReport.item_id,
        models.Item.name.label("product_name"),
        models.ShortageReport.notes,
        models.ShortageReport.created_at,
        models.ShortageReport.resolved_at
    ).outerjoin(
        models.Item, models.Item.id == models.ShortageReport.item_id
    ).filter(
        models.ShortageReport.resolved_at.is_(None)
    ).order_by(
        models.ShortageReport.created_at.desc()
    ).all()

    result = []
    for r in reports:
        result.append({
            "id": r.id,
            "item_id": r.item_id,
            "product_name": r.product_name,
            "notes": r.notes,
            "created_at": r.created_at,
            "resolved_at": r.resolved_at
        })
    return result

def get_all_shortages(db: Session):
    reports = db.query(
        models.ShortageReport.id,
        models.ShortageReport.item_id,
        models.Item.name.label("product_name"),
        models.ShortageReport.notes,
        models.ShortageReport.created_at,
        models.ShortageReport.resolved_at
    ).outerjoin(
        models.Item, models.Item.id == models.ShortageReport.item_id
    ).order_by(
        models.ShortageReport.created_at.desc()
    ).all()

    return [
        {
            "id": r.id,
            "item_id": r.item_id,
            "product_name": r.product_name,
            "notes": r.notes,
            "created_at": r.created_at,
            "resolved_at": r.resolved_at
        }
        for r in reports
    ]

def _report_with_name(db: Session, report: models.ShortageReport) -> dict:
    """Helper: arricchisce un report con il product_name dall'item associato."""
    product_name = None
    if report.item_id:
        item = db.query(models.Item).filter(models.Item.id == report.item_id).first()
        product_name = item.name if item else None
        
    return {
        "id": report.id,
        "item_id": report.item_id,
        "product_name": product_name,
        "notes": report.notes,
        "created_at": report.created_at,
        "resolved_at": report.resolved_at,
    }

def create_shortage_report(db: Session, report_data: schemas.ShortageReportCreate):
    if report_data.item_id:
        item = db.query(models.Item).filter(models.Item.id == report_data.item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Prodotto non trovato nel catalogo")

        existing = db.query(models.ShortageReport).filter(
            models.ShortageReport.item_id == report_data.item_id,
            models.ShortageReport.resolved_at.is_(None)
        ).first()
        
        if existing:
            if report_data.notes:
                existing.notes = report_data.notes
            commit_and_refresh(db, existing)
            return _report_with_name(db, existing)

    new_report = models.ShortageReport(
        item_id=report_data.item_id,
        notes=report_data.notes
    )
    db.add(new_report)
    report = commit_and_refresh(db, new_report)

    return _report_with_name(db, report)

def resolve_shortage_report(db: Session, report_id: str):
    report = db.query(models.ShortageReport).filter(models.ShortageReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Segnalazione non trovata")
    
    # Impedire doppio resolve
    if report.resolved_at is not None:
        raise HTTPException(status_code=400, detail="Segnalazione già risolta")
    
    report.resolved_at = func.now()
    commit_and_refresh(db, report)
    # Usa l'helper per ritornare product_name popolato (allineato con get_active/get_all)
    return _report_with_name(db, report)