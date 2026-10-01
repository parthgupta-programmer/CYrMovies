import pandas as pd
from src.preprocessing.split import chronological_split, filter_sparse


def test_chronological_split():
    ratings = pd.DataFrame({
        "userId": [1, 1, 1, 2, 2, 2],
        "movieId": [10, 11, 12, 20, 21, 22],
        "rating": [3, 4, 5, 3, 4, 5],
        "timestamp": [1, 2, 3, 1, 2, 3],
    })
    train, val, test = chronological_split(ratings)
    assert set(test.movieId) == {12, 22}
    assert set(val.movieId) == {11, 21}
    assert set(train.movieId) == {10, 20}


def test_filter_sparse():
    train = pd.DataFrame({"userId": [1,1,1,1,1,2], "movieId": [10,10,10,10,10,10]})
    val = pd.DataFrame({"userId": [1,2], "movieId": [11,11]})
    test = pd.DataFrame({"userId": [1,2], "movieId": [12,12]})
    t, v, s = filter_sparse(train, val, test, min_user_train=5, min_item_train=5)
    assert set(t.userId) == {1}
