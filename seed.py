def seed_data(mongo_uri="mongodb://epyc:27017", db_name="forensic_system"):
    """往 MongoDB 中插入示例数据"""
    
    try:
        case_store = CaseStore(mongo_uri=mongo_uri, db_name=db_name)
        material_store = MaterialStore(mongo_uri=mongo_uri, db_name=db_name)
        
        # 使用模板模式定义不同类型的案件
        case_templates = {
            "traffic": {
                "template": {
                    "case_type": "交通事故",
                    "required_materials": ["事故认定书", "伤情鉴定", "治疗记录"],
                    "workflow_status": ["初检", "鉴定中", "完成"]
                },
                "sample_materials": [
                    {
                        "material_type": "事故认定书",
                        "source": "交警大队",
                        "template_fields": ["事故时间", "地点", "责任认定"]
                    }
                ]
            },
            "medical": {
                "template": {
                    "case_type": "医疗事故",
                    "required_materials": ["病历", "检查报告", "手术记录"],
                    "workflow_status": ["资料收集", "专家会诊", "出具报告"]
                },
                "sample_materials": [
                    {
                        "material_type": "病历",
                        "source": "医院",
                        "template_fields": ["主诉", "诊断", "治疗方案"]
                    }
                ]
            }
        }

        # 创建每种类型的示例案件
        for case_type, template in case_templates.items():
            case_data = create_sample_case(template)
            try:
                case_id = case_store.create_case(case_data)
                create_sample_materials(case_id, template["sample_materials"], material_store)
            except Exception as e:
                logger.error(f"Error creating {case_type} case: {str(e)}")
                continue

    except Exception as e:
        logger.error(f"Seed data error: {str(e)}")
        raise
    finally:
        case_store.close_connection()
        material_store.close_connection()