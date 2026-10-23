import urllib.request
import json
import sys

REPO = "Dilim0n/LGRay"

def get_stats():
    try:
        # Repo basic info
        req = urllib.request.Request(f"https://api.github.com/repos/{REPO}", headers={"User-Agent": "LGRay-Stats"})
        with urllib.request.urlopen(req) as response:
            repo_data = json.loads(response.read().decode('utf-8'))
        
        # Releases download counts
        req_rel = urllib.request.Request(f"https://api.github.com/repos/{REPO}/releases", headers={"User-Agent": "LGRay-Stats"})
        with urllib.request.urlopen(req_rel) as response:
            rel_data = json.loads(response.read().decode('utf-8'))
        
        print("=" * 45)
        print(f"📊 СТАТИСТИКА РЕПОЗИТОРИЯ {REPO}")
        print("=" * 45)
        print(f"⭐ Звёзды (Stars):    {repo_data.get('stargazers_count', 0)}")
        print(f"🍴 Форки (Forks):    {repo_data.get('forks_count', 0)}")
        print(f"👀 Наблюдатели:      {repo_data.get('watchers_count', 0)}")
        print(f"🐛 Issues:           {repo_data.get('open_issues_count', 0)}")
        print("-" * 45)
        print("📦 СКАЧИВАНИЯ РЕЛИЗОВ (IPK & Manifest):")
        total_downloads = 0
        for release in rel_data:
            tag = release.get('tag_name', 'unknown')
            print(f"  Релиз {tag}:")
            for asset in release.get('assets', []):
                name = asset.get('name')
                count = asset.get('download_count', 0)
                if name.endswith('.ipk'):
                    total_downloads += count
                print(f"    - {name}: {count} раз")
        print("-" * 45)
        print(f"🚀 Всего установок IPK: {total_downloads}")
        print("=" * 45)
    except Exception as e:
        print(f"Ошибка получения статистики: {e}")

if __name__ == "__main__":
    get_stats()
