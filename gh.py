# An example to get the remaining rate limit using the Github GraphQL API.

import curses
import subprocess
import requests
import os
import json

TOKEN = os.getenv("GITHUB_TOKEN")
headers = {"Authorization": "token " + TOKEN}


def graphql(query):
	request = requests.post('https://api.github.com/graphql', json={'query': query}, headers=headers)
	if request.status_code == 200:
		return request.json()
	else:
		raise Exception("Query failed to run by returning code of {}. {}".format(request.status_code, query))

def get_notifications():
	request = requests.get('https://api.github.com/notifications', headers=headers)
	if request.status_code == 200:
		return request.json()
	else:
		raise Exception("Query failed to run by returning code of {}. {}".format(request.status_code, query))

def build_agenda():
	agenda = {
	}

	json = get_notifications()
	for notif in json:
		repo = notif["repository"]["name"]
		owner = notif["repository"]["owner"]["login"]
		repo_id = u"r" + str(notif["repository"]["owner"]["id"]) + "_" + str(notif["repository"]["id"])
		url = notif["subject"]["url"]
		typ = notif["subject"]["type"]
		typ = typ[0].lower() + typ[1:]
		number = url.split('/')[-1]
		if notif["subject"]["latest_comment_url"] != None:
			url = notif["subject"]["latest_comment_url"]

		if repo_id not in agenda:
			agenda[repo_id] = {
				"owner": owner,
				"repo": repo,
				"nodes": {},
			}

		agenda[repo_id]["nodes"][u"i"+str(number)] = {
			"type": typ,
			"number": number,
			"url": url,
			"updated_at": notif["updated_at"],
			"reason": notif["reason"],
		}
	return agenda

def build_graphql_query(agenda):
	q = "{"
	for repo_id, repo in agenda.items():
		q += """
			%s: repository(owner: "%s", name: "%s") {
		""" % (repo_id, repo["owner"], repo["repo"])
		for key, item in repo["nodes"].items():
			q += """
				%s: issueOrPullRequest(number: %s) {
					__typename
					...issuedata
					...prdata
				}
			""" % (key, item["number"])
		q += "}"
	q += """
	}
	fragment issuedata on Issue {
		url
		title
		number
		closed
		timeline(last:1){
			edges { node { ...timelinedata } }
		}
	}
	fragment prdata on PullRequest {
		url
		title
		number
		state
		labels(first:5){
			edges { node { name } }
		}
		timeline(last:1){
			edges { node { ...timelinedata } }
		}
	}
	fragment timelinedata on Node {
		__typename
		... on UniformResourceLocatable { url }
		... on IssueComment { url }
		... on Commit { url }
		... on Issue { url }
	}
	"""
	return q

def query_notifications(q, agenda):
	#print q
	result = graphql(q) # Execute the query
	#print result

	for repo_id, repo in result['data'].items():
		for key, d in repo.items():
			state = d["state"] if "state" in d else ( "CLOSED" if d["closed"] else "OPEN" )
			agenda[repo_id]["nodes"][key].update(d)
			agenda[repo_id]["nodes"][key]["state"] = state

			if len(d["timeline"]["edges"]):
				node = d["timeline"]["edges"][0]["node"]
				agenda[repo_id]["nodes"][key]["latest"] = {
					"type": node["__typename"],
					"url":  node["url"] if "url" in node else None,
				}
				del agenda[repo_id]["nodes"][key]["timeline"]
	return agenda

class Controller:
	def __init__(self, agenda, view):
		self.view = view
		self.agenda = agenda

	def move_cursor(self, direction):
		new_i = self.view.cursor[0] + direction[0]
		if 0 <= new_i and new_i < self.agenda.get_height():
			self.view.cursor[0] = new_i
		#new_j = self.cursor[1] + direction[1]
		#if 0 <= new_j and new_j < self.agenda.width:
		#	self.cursor[1] = new_j

	def search(self, c):
		if c in (ord("\n"),):
			self.agenda.search_mode = False
			self.agenda.linearize()
			self.view.cursor[0] = 0
			self.view.draw(self.agenda)
		else:
			self.agenda.search_phrase += chr(c)

	def key_press(self, c):
		if self.agenda.search_mode:
			self.search(c)
		elif c in (ord('h'), curses.KEY_LEFT):
			self.move_cursor((0, -1))
		elif c in (ord('l'), curses.KEY_RIGHT):
			self.move_cursor((0, 1))
		elif c in (ord('k'), curses.KEY_UP):
			self.move_cursor((-1, 0))
		elif c in (ord('j'), curses.KEY_DOWN):
			self.move_cursor((1, 0))
		elif c in (ord('r'),):
			self.reload()
		elif c in (ord('/'),):
			self.agenda.search_phrase = ""
			self.agenda.search_mode = True
		elif c in (ord('m'),):
			self.mute_selection()
		elif c in (ord('x'),):
			self.toggle_selection()
		elif c == ord("\n"):
			self.open_selection()
		elif c == ord("o"):
			self.open_selection(True)

	def reload(self):
		self.view.loading(self.agenda)
		self.agenda.load()
		self.view.cursor[0] = 0
		self.view.draw(self.agenda)

	def mute_selection(self):
		return "not yet implemented"
		self.view.message("Muting...")
		self.agenda.mute( self.get_selected() )
		self.view.draw(self.agenda)

	def open_selection(self, bg=False):
		for (repo, notif) in self.get_selected():
			url = notif["url"]
			if bg:
				subprocess.call(['open', '-g', url])
			else:
				subprocess.call(['open', url])

	def toggle_selection(self):
		ids = self.get_ids_under_cursor()
		if ids not in self.agenda.selection:
			self.agenda.selection += [ ids ]
		else:
			self.agenda.selection.remove( ids )
		self.view.draw(self.agenda)

	def get_ids_under_cursor(self):
		repo_id, key = self.agenda.notifications[ self.view.cursor[0] ]
		return (repo_id, key)
	
	def get_under_cursor(self):
		repo_id, key = self.get_ids_under_cursor()
		repo, notif = self.agenda.lookup(repo_id, key)
		return repo, notif

	def get_selected(self):
		selected = self.agenda.selection
		if len(selected) == 0:
			selected = [ self.get_ids_under_cursor() ]
		return [ self.agenda.lookup(repo_id, key) for (repo_id,key) in selected ]

class View:
	def __init__(self, screen):
		self.cursor = [0,2]
		self.screen = screen
		self.column_widths = [3,7,13,-1,21,0]
		curses.init_pair(1, curses.COLOR_WHITE,    curses.COLOR_RED)
		curses.init_pair(2, curses.COLOR_GREEN,  curses.COLOR_BLACK)
		curses.init_pair(3, curses.COLOR_YELLOW, curses.COLOR_BLACK)
		curses.init_pair(4, curses.COLOR_BLUE,    curses.COLOR_BLACK)
		curses.init_pair(5, curses.COLOR_WHITE, curses.COLOR_MAGENTA)
		curses.init_pair(6, curses.COLOR_CYAN,   curses.COLOR_BLACK)
		curses.init_pair(7, curses.COLOR_WHITE,   curses.COLOR_BLACK)
		curses.init_pair(8, curses.COLOR_BLACK,   curses.COLOR_WHITE)
		curses.init_pair(9, curses.COLOR_BLACK,  curses.COLOR_BLACK)

	def loading(self, model=None):
		if model == None:
			self.screen.move( 0, 0 )
		else:
			self.screen.move( model.get_height() , 0 )
		self.screen.addstr("Loading...")
		self.screen.refresh()
	
	def draw(self, model):
		self.screen.clear()
		i = 0
		max_name = 0
		for (repo_id, key) in model.notifications:
			repo, d = model.lookup(repo_id, key)
			name = self.get_name(repo, d)
			max_name = max(len(name)+1, max_name)
		self.column_widths[3] = max_name
		for (repo_id, key) in model.notifications:
			self.draw_line(model, i, repo_id, key)
			i += 1

	@classmethod
	def get_name(cls, repo, d):
		return repo["owner"] + "/" + repo["repo"] + "#" + str(d["number"])

	def draw_line(self, model, i, repo_id, key):
		x = 0
		repo, d = model.lookup(repo_id, key)

		typename = "PR" if d["__typename"] == "PullRequest" else "I"
		name = self.get_name(repo, d)

		if (repo_id, key) in model.selection:
			color = 8
		else:
			color = 7
		self.screen.addstr(i,  x, typename   , curses.color_pair(color))

		color = 7
		if d["state"] == "OPEN":
			color = 2
		elif d["state"] == "MERGED":
			color = 5
		else:
			color = 1
		x += self.column_widths[0]
		self.screen.addstr(i, x, d["state"] , curses.color_pair(color))
		x += self.column_widths[1]
		self.screen.addstr(i, x, d["reason"], curses.color_pair(4))
		x += self.column_widths[2]
		self.screen.addstr(i, x, name       , curses.color_pair(7) | curses.A_DIM)
		x += self.column_widths[3]
		self.screen.addstr(i, x, d["updated_at"] , curses.color_pair(6) | curses.A_DIM)
		x += self.column_widths[4]
		self.screen.addstr(i, x, d["title"] , curses.color_pair(7) | curses.A_BOLD)
	
	def tick(self, model):
		if model.search_mode:
			self.screen.move( model.get_height() , 0 )
			self.screen.addstr("/" + model.search_phrase)
			self.screen.refresh()
		else:
			self.screen.move( self.cursor[0], self.cursor[1] )

class Agenda:
	def __init__(self):
		self.selection = []
		self.notifications = []
		self.search_mode = False
		self.search_phrase = ""
		self.load()
		pass

	def load(self):
		agenda = build_agenda()
		query = build_graphql_query(agenda)
		self.agenda = query_notifications(query, agenda)
		self.linearize()
		#print json.dumps(notifications, indent=4)
	
	def linearize(self):
		self.notifications = []
		for repo_id, repo in self.agenda.items():
			for key, d in repo["nodes"].items():
				if len(self.search_phrase) > 0:
					if self.search_phrase not in d["title"]:
						continue
				self.notifications += [[repo_id, key]]
	
	def get_height(self):
		return len(self.notifications)

	def lookup(self, repo_id, key):
		return self.agenda[repo_id], self.agenda[repo_id]["nodes"][key]


def main(stdscr):
	view = View(stdscr)
	view.loading()
	agenda = Agenda()
	ctrl = Controller(agenda, view)
	view.draw(agenda)

	while True:
		view.tick(agenda)
		key = stdscr.getch()
		if key == ord('q'):
			break
		ctrl.key_press(key)

if __name__ == '__main__':
	curses.wrapper(main)
