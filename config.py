# ... existing code ...

class BaseConfig:
    # ... other base configuration ...
    
    # Default storage configuration
    STORAGE_CONFIG = {
        'type': 'local',
        'base_path': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'storage/files')
    }

class DevelopmentConfig(BaseConfig):
    # ... development specific configuration ...
    # Inherits STORAGE_CONFIG from BaseConfig
    pass

class ProductionConfig(BaseConfig):
    # ... production specific configuration ...
    # Can override STORAGE_CONFIG if needed
    pass

# ... rest of the config file ...