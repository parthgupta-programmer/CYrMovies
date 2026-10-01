import numpy as np


def evaluate_model(
    model,
    user_items,
    test_df,
    user_to_idx,
    k=10,
    max_users=10000,
):
    """
    Evaluate top-K recommendations.

    IMPORTANT:
    user indices MUST come from the same user_to_idx mapping
    used to create the training matrix and train the ALS model.
    """

    # ---------------------------------------------------------
    # Build ground truth using the SAME training user mapping
    # ---------------------------------------------------------

    test_truth = {}

    for row in test_df.itertuples(index=False):

        raw_user_id = int(row.userId)
        raw_movie_id = int(row.movieId)

        # Ignore users that aren't present in the trained model
        if raw_user_id not in user_to_idx:
            continue

        user_idx = user_to_idx[raw_user_id]

        # Ignore movies outside the trained item catalogue
        # if movie_idx is not available in test_df.
        movie_idx = getattr(row, "movie_idx", None)

        if movie_idx is None:
            continue

        movie_idx = int(movie_idx)

        if user_idx not in test_truth:
            test_truth[user_idx] = set()

        test_truth[user_idx].add(movie_idx)

    if not test_truth:
        raise ValueError(
            "No valid test users found in the training user index mapping."
        )

    # ---------------------------------------------------------
    # Select users for evaluation
    # ---------------------------------------------------------

    users = np.array(
        list(test_truth.keys()),
        dtype=np.int32
    )

    if len(users) > max_users:

        rng = np.random.default_rng(42)

        users = rng.choice(
            users,
            size=max_users,
            replace=False
        )

    # ---------------------------------------------------------
    # Sanity check
    # ---------------------------------------------------------

    max_valid_user_idx = model.user_factors.shape[0] - 1

    invalid_users = users[
        users > max_valid_user_idx
    ]

    if len(invalid_users) > 0:

        raise ValueError(
            f"Evaluation contains invalid user indices. "
            f"Max model index={max_valid_user_idx}, "
            f"first invalid={invalid_users[0]}"
        )

    # ---------------------------------------------------------
    # Generate recommendations
    # ---------------------------------------------------------

    recommended, scores = model.recommend(
        userid=users,
        user_items=user_items[users],
        N=k,
        filter_already_liked_items=True
    )

    # ---------------------------------------------------------
    # Metrics
    # ---------------------------------------------------------

    precision_sum = 0.0
    recall_sum = 0.0
    hit_sum = 0.0
    ndcg_sum = 0.0

    recommended_items = set()

    for row_idx, user_idx in enumerate(users):

        user_idx = int(user_idx)

        actual_items = test_truth[user_idx]

        recs = recommended[row_idx]

        hits = 0
        dcg = 0.0

        for rank, item_idx in enumerate(recs, start=1):

            item_idx = int(item_idx)

            recommended_items.add(item_idx)

            if item_idx in actual_items:

                hits += 1

                dcg += (
                    1.0 /
                    np.log2(rank + 1)
                )

        # Precision
        precision = hits / k

        # Recall
        recall = (
            hits / len(actual_items)
            if len(actual_items) > 0
            else 0.0
        )

        # Hit Rate
        hit = 1.0 if hits > 0 else 0.0

        # NDCG
        ideal_hits = min(
            len(actual_items),
            k
        )

        if ideal_hits > 0:

            idcg = sum(
                1.0 /
                np.log2(rank + 1)

                for rank
                in range(1, ideal_hits + 1)
            )

            ndcg = (
                dcg / idcg
                if idcg > 0
                else 0.0
            )

        else:

            ndcg = 0.0

        precision_sum += precision
        recall_sum += recall
        hit_sum += hit
        ndcg_sum += ndcg

    num_users = len(users)

    coverage = (
        len(recommended_items)
        / model.item_factors.shape[0]
    )

    return {
        f"Precision@{k}": (
            precision_sum /
            num_users
        ),

        f"Recall@{k}": (
            recall_sum /
            num_users
        ),

        f"HitRate@{k}": (
            hit_sum /
            num_users
        ),

        f"NDCG@{k}": (
            ndcg_sum /
            num_users
        ),

        f"Coverage@{k}": coverage
    }