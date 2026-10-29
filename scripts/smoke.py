"""Functional local readiness check. Run with both services started."""
import http.client
import json
import os


def request(path, body=None):
    connection = http.client.HTTPConnection('127.0.0.1', int(os.getenv('LAB_FRONTEND_PORT', '3000')), timeout=30)
    payload = json.dumps(body) if body is not None else None
    connection.request('POST' if payload else 'GET', '/api/' + path, payload, {'Content-Type': 'application/json'})
    response = connection.getresponse()
    result = json.loads(response.read())
    connection.close()
    assert response.status == 200, (path, response.status, result)
    return result


assert request('health')['status'] == 'ok'
reference = request('reference/rover')
assert reference['robot']['provenance'] == 'reference'
project = {'robot': reference['robot'], 'task': {'description': 'Drive forward on a flat floor'}}
assert request('recommend', project)['recommended_id'] == 'cpu'
run = request('simulate', {**project, 'duration_s': 1, 'hardware_id': 'cpu'})
assert run['metrics']['steps'] == 500
assert run['metrics']['displacement_m'] > .1
assert len(run['frames']) > 20
assert run['task_completed'] is None and not run['hardware_benchmarked']
print(json.dumps({'status': 'passed', 'engine': run['engine'], 'metrics': run['metrics']}, indent=2))
