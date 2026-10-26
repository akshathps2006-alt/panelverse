import pandas as pd
import numpy as np
from scipy import stats
from scipy.stats.mstats import winsorize
import seaborn as sns
import matplotlib.pyplot as plt

df = sns.load_dataset("titanic")
print(df.head())
df.info()
print(df.isnull().sum())

df["age"] = df["age"].fillna(df["age"].median())
df["embarked"] = df["embarked"].fillna(df["embarked"].mode().iloc[0])
df.drop(columns="deck", inplace=True)
df.dropna(subset="embark_town", inplace=True)

z_scores = np.abs(stats.zscore(df[["age", "fare"]]))
df_z = df[(z_scores < 3).all(axis=1)]
print("Original shape:", df.shape)
print("After Z-score removal:", df_z.shape)

q1, q3 = df["fare"].quantile([0.25, 0.75])
iqr = q3 - q1
df_iqr = df[df["fare"].between(q1 - 1.5 * iqr, q3 + 1.5 * iqr)]
print("After IQR filtering:", df_iqr.shape)

df["fare_winsorized"] = winsorize(df["fare"], limits=[0.05, 0.05])
print(df[["fare", "fare_winsorized"]].head())

plt.figure(figsize=(12, 5))

plt.subplot(1, 2, 1)
sns.boxplot(df["fare"])
plt.title("Original Fare")

plt.subplot(1, 2, 2)
sns.boxplot(df["fare_winsorized"])
plt.title("Winsorized Fare")

plt.show()
