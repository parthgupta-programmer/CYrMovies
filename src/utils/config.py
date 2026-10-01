from dataclasses import dataclass
from pathlib import Path
import os


@dataclass(frozen=True)
class Settings:
    data_dir: Path = Path(os.getenv("DATA_DIR", "./data/ml-32m"))
    model_dir: Path = Path(os.getenv("MODEL_DIR", "./models"))
    output_dir: Path = Path(os.getenv("OUTPUT_DIR", "./outputs"))
