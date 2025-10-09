import os


def get_data_file_path(file_name: str) -> str:
    file_path = os.path.join(os.path.dirname(__file__), "../../data", file_name)
    if not os.path.exists(file_path):
        print(f"- File {file_path} does not exist")
        exit(1)
    return file_path
