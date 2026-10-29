from __future__ import annotations

from pathlib import Path
from typing import Union
import pandas as pd


def load_movies(path: Union[str, Path]) -> pd.DataFrame:
    return pd.read_csv(
        path,
        dtype={"movieId": "int32", "title": "string", "genres": "string"},
    )


def load_ratings(path: Union[str, Path]) -> pd.DataFrame:
    return pd.read_csv(
        path,
        usecols=["userId", "movieId", "rating", "timestamp"],
        dtype={
            "userId": "int32",
            "movieId": "int32",
            "rating": "float32",
            "timestamp": "int32",
        },
        memory_map=True,
    )


def load_links(path: Union[str, Path]) -> pd.DataFrame:
    return pd.read_csv(
        path,
        dtype={"movieId": "int32", "imdbId": "Int32", "tmdbId": "Int32"},
    )


def load_tags(path: Union[str, Path]) -> pd.DataFrame:
    return pd.read_csv(
        path,
        usecols=["userId", "movieId", "tag"],
        dtype={"userId": "int32", "movieId": "int32", "tag": "string"},
    )
