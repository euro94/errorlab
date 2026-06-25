#!/usr/bin/env python3
"""ErrorLab HTTP server — serves PWA + proxies OpenAI vision calls with stored key."""
import http.server, os, sys, json, urllib.request

PORT = 8734
ROOT = os.path.dirname(os.path.abspath(__file__))
KEY_FILE = os.path.join(ROOT, '.openai_key')

def get_api_key():
    try:
        with open(KEY_FILE) as f:
            key = f.read().strip()
            if key and key.startswith('sk-'):
                return key
    except: pass
    return None

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path = self.path.split('?')[0].split('#')[0]
        if path == '/' or ('.' not in os.path.basename(path.rstrip('/')) and not path.startswith('/api/')):
            self.path = '/index.html'
        super().do_GET()

    def do_POST(self):
        if self.path == '/api/extract':
            key = get_api_key()
            if not key:
                self.send_error(503, 'No API key on server')
                return
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length)
                data = json.loads(body)
                image = data.get('image', '')

                req = urllib.request.Request('https://api.openai.com/v1/chat/completions',
                    data=json.dumps({
                        'model': 'gpt-4o-mini',
                        'messages': [
                            {'role': 'system', 'content': SYSTEM_PROMPT},
                            {'role': 'user', 'content': [
                                {'type': 'image_url', 'image_url': {'url': image, 'detail': 'high'}},
                                {'type': 'text', 'text': 'Extract from this Becker FAR question photo.'}
                            ]}
                        ],
                        'max_tokens': 1000,
                        'temperature': 0
                    }).encode(),
                    headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {key}'
                    }
                )
                resp = urllib.request.urlopen(req, timeout=30)
                result = json.loads(resp.read())
                content = result['choices'][0]['message']['content']

                # Parse JSON from response
                try: parsed = json.loads(content)
                except:
                    import re
                    m = re.search(r'```(?:json)?\s*([\s\S]*?)```', content) or re.search(r'(\{[\s\S]*\})', content)
                    parsed = json.loads(m.group(1)) if m else {}

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'question': parsed.get('question', ''),
                    'correctAnswer': parsed.get('correctAnswer', ''),
                    'yourAnswer': parsed.get('yourAnswer', ''),
                    'topic': parsed.get('topic', ''),
                    'outcome': parsed.get('outcome', 'honest_gap'),
                    'failureReason': parsed.get('failureReason', 'conceptual'),
                    'skillLevel': parsed.get('skillLevel', 'application'),
                    'farNode': parsed.get('farNode', ''),
                    'farSubNode': parsed.get('farSubNode', ''),
                    'errorNote': parsed.get('errorNote', '')
                }).encode())
            except Exception as e:
                self.send_error(502, str(e))
        else:
            self.send_error(404)

SYSTEM_PROMPT = '''You are an OCR and accounting question extractor for CPA FAR exam prep. Extract this JSON:
{"question":"Full stem","correctAnswer":"Correct answer","yourAnswer":"Student wrong answer","topic":"Topic","outcome":"mastered|fragile|honest_gap|misconception","failureReason":"conceptual|application|computational|misread|trap|pacing|incomplete|stale","skillLevel":"remembering|application|analysis","farNode":"content key","errorNote":"diagnosis"}
Rules: return ONLY valid JSON, no markdown.'''

if __name__ == '__main__':
    http.server.HTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
