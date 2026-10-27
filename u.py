import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

np.random.seed(0)
n = 100

data = pd.DataFrame({
    'serial_no': range(1, n+1),
    'date': pd.date_range('2026-01-01', periods=n, freq='D'),
    'user_id': np.random.choice(['U101', 'U102', 'U103'], n),
    'user_type': np.random.choice(['Regular', 'Premium'], n),
    'user_class': np.random.choice(['Gold', 'Silver', 'Bronze'], n),
    'product_id': np.random.choice(['P1', 'P2', 'P3', 'P4'], n),
    'price': np.random.randint(100, 1000, n),
    'quantity_purchased': np.random.randint(1, 5, n)
})

data['purchase_week'] = data['date'].dt.isocalendar().week
print(data.head())

user_data = data[data['user_id'] == 'U101'].sort_values('date')

plt.figure()
plt.plot(user_data['date'], user_data['price'])
plt.xlabel('Date')
plt.ylabel('Price')
plt.title('Price Trend for User U101 Over Time')
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()
