"""Sample database for the App Store screenshots: a learner of Spanish."""
import json, sys, datetime as dt
import os
VOC = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'data', 'vocabulary.json')))
U = "00000000-0000-4000-8000-000000000001"
today = dt.date.today().isoformat()
now = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)
iso = lambda d: d.strftime('%Y-%m-%dT%H:%M:%S.000Z')

vocab, trans = [], []
for tid, words in VOC.items():
    for w in words:
        vocab.append({k: w.get(k) for k in ('id', 'topic_id', 'context', 'part_of_speech', 'difficulty_level', 'example_sentence', 'learning_order')} | {'word_en': w['english']})
        es = w['translations'].get('es', {}).get('word')
        if es: trans.append({'vocabulary_id': w['id'], 'language_code': 'es', 'translated_word': es})

left = VOC['4'][0]['id']
sentences = [
    ("Gira a la izquierda en el semáforo.", "Turn left at the traffic light."),
    ("La farmacia está a la izquierda.", "The pharmacy is on the left."),
    ("Toma la segunda calle a la izquierda.", "Take the second street on the left."),
]
ex = []
for i, (es, en) in enumerate(sentences, 1):
    ex.append({'id': i, 'vocabulary_id': left, 'language_code': 'es', 'sentence': es, 'translation': en, 'sentence_order': i})
    ex.append({'id': 100 + i, 'vocabulary_id': left, 'language_code': 'en', 'sentence': en, 'translation': en, 'sentence_order': i})

# Leaderboard: 11 learners ahead, then us, then the rest.
plays = [{'user_id': U, 'target_language_code': 'es', 'play_count': 2140, 'last_played_at': iso(now)}]
for i in range(80):
    pc = 5200 - i * 60 if i < 11 else 2100 - i * 20
    plays.append({'user_id': f'00000000-0000-4000-8000-{i+100:012d}', 'target_language_code': 'es', 'play_count': max(40, pc), 'last_played_at': iso(now)})

sr = [{'id': i, 'user_id': U, 'vocabulary_id': w['id'], 'target_language_code': 'es', 'state': 2, 'difficulty': 5, 'stability': 3, 'reps': 3, 'lapses': 0, 'due': iso(now - dt.timedelta(hours=2))}
      for i, w in enumerate(VOC['3'][:23], 1)]

playlists = [
    {'id': f'p{i}', 'user_id': U, 'name': n, 'source_language_code': 'en', 'target_language_code': 'es', 'created_at': iso(now), 'updated_at': iso(now - dt.timedelta(days=i)), 'user_playlist_words': [{'count': c}]}
    for i, (n, c) in enumerate([('Trip to Madrid', 28), ('Getting around', 12), ('Everyday Spanish', 41), ('Words I always forget', 9)])
]

topics_done = [{'user_id': U, 'topic_id': t, 'target_language_code': 'es', 'total_words': n, 'words_learned': l, 'is_completed': l >= n, 'completion_count': 1 if l >= n else 0}
               for t, n, l in [(1, 36, 34), (2, 47, 41), (3, 46, 29), (4, 60, 22), (7, 77, 31), (18, 64, 18), (6, 80, 47)]]

import urllib.request
TOPICS = json.load(urllib.request.urlopen('http://localhost:3123/api/topics'))
S = {
    'topics': [{'id': t['id'], 'name': t['name']} for t in TOPICS],
    'vocabulary': vocab,
    'vocabulary_translations': trans,
    'example_sentences': ex,
    'user_language_progress': [{'user_id': U, 'target_language_code': 'es', 'total_words_learned': 1259, 'completion_percentage': '30'}],
    'user_daily_progress': [{'user_id': U, 'target_language_code': 'es', 'activity_date': today, 'words_learned_count': 44}],
    'user_login_streaks': [{'user_id': U, 'current_streak': 18, 'longest_streak': 21, 'last_login_date': today}],
    'user_topic_completion': topics_done,
    'user_word_progress': plays,
    'user_sr_cards': sr,
    'user_playlists': playlists,
    'user_profiles': [{'id': U, 'timezone': 'UTC', 'learning_settings': {'autoPlay': True, 'pronunciationSpeed': 'Normal', 'pauseBetweenTranslations': 1, 'pauseForNextWord': 1.5, 'repeatTargetLanguage': 2, 'repeatMainLanguage': 1, 'showPlayCount': True}, 'subscription_status': 'premium', 'subscription_plan': 'yearly', 'subscription_period_end': '2027-06-01T00:00:00Z'}],
    'rpc:get_topic_word_counts': [{'topic_id': int(t), 'word_count': len(w)} for t, w in VOC.items()],
}
json.dump(S, open(sys.argv[1], 'w'))
print({k: len(v) for k, v in S.items()})
