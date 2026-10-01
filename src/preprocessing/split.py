import pandas as pd


def chronological_split(
    ratings: pd.DataFrame,
    min_user_interactions: int = 3,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    ratings = ratings.sort_values(["userId", "timestamp"]).reset_index(drop=True)
    counts = ratings.groupby("userId")["movieId"].transform("size")
    positions = ratings.groupby("userId").cumcount()
    eligible = counts >= min_user_interactions
    data = ratings.loc[eligible].copy()
    counts = counts.loc[eligible]
    positions = positions.loc[eligible]

    test = data.loc[positions == (counts - 1)].copy()
    validation = data.loc[positions == (counts - 2)].copy()
    train = data.loc[positions < (counts - 2)].copy()
    return train, validation, test


def filter_sparse(
    train: pd.DataFrame,
    validation: pd.DataFrame,
    test: pd.DataFrame,
    min_user_train: int = 5,
    min_item_train: int = 10,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    valid_users = train.groupby("userId").size()
    valid_users = valid_users[valid_users >= min_user_train].index
    train = train[train["userId"].isin(valid_users)].copy()
    validation = validation[validation["userId"].isin(valid_users)].copy()
    test = test[test["userId"].isin(valid_users)].copy()

    valid_movies = train.groupby("movieId").size()
    valid_movies = valid_movies[valid_movies >= min_item_train].index
    train = train[train["movieId"].isin(valid_movies)].copy()
    validation = validation[validation["movieId"].isin(valid_movies)].copy()
    test = test[test["movieId"].isin(valid_movies)].copy()
    return train, validation, test
