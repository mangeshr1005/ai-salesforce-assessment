
from database import engine, Base
import models


def initialize_database():
    Base.metadata.create_all(bind=engine)
    print("Database initialized successfully!")
    print("Tables created: assessments, questions")


if __name__ == "__main__":
    initialize_database()
