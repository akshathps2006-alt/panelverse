import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
from sklearn.preprocessing import StandardScaler, MinMaxScaler
import numpy as np

titanic = sns.load_dataset("titanic")
df = titanic.copy()

print(df.head())
df.info()

for col in ["age", "fare"]:
    df[col] = df[col].fillna(df[col].median())
df["embarked"] = df["embarked"].fillna(df["embarked"].mode()[0])

df = pd.get_dummies(
    df.drop(columns="deck"),
    columns=["sex", "embarked", "class", "who", "adult_male"],
    drop_first=True,
)

col = ["age", "fare"]
df[col] = StandardScaler().fit_transform(df[col])
df[col] = MinMaxScaler().fit_transform(df[col])

plt.plot(df["age"], label="Age")
plt.title("Line Plot of Age")
plt.legend()
plt.show()

plt.scatter(df["age"], df["fare"])
plt.xlabel("Age")
plt.ylabel("Fare")
plt.title("Age vs Fare")
plt.show()

sns.barplot(x="pclass", y="survived", data=titanic)
plt.title("Survival Rate by Class")
plt.show()

plt.hist(df["age"], bins=20)
plt.title("Age Distribution")
plt.show()

sns.boxplot(x=df["fare"])
plt.title("Box Plot of Fare")
plt.show()

sns.violinplot(x="survived", y="age", data=titanic)
plt.title("Violin Plot of Age vs Survival")
plt.show()

plt.figure(figsize=(12, 8))
sns.heatmap(df.select_dtypes(include=np.number).corr(), annot=False)
plt.title("Correlation Heatmap")
plt.show()
