extends Control

# Pocket Party: offline-first local party-game prototype.
# All art is drawn in code so the project stays lightweight and editable.

const SW := 1280.0
const SH := 720.0
const INK := Color("#17233E")
const MUTED := Color("#69758D")
const BG := Color("#F3F6FC")
const WHITE := Color("#FFFFFF")
const PURPLE := Color("#5848D8")
const YELLOW := Color("#FFE16B")
const PLAYER_COLORS: Array[Color] = [Color("#28B8E8"), Color("#FF657D"), Color("#8BCF45"), Color("#FFA940")]
const BUTTON_COLORS: Array[Color] = [Color("#FF657D"), Color("#28B8E8"), Color("#FFD34E"), Color("#43C99A")]
const BUTTON_LABELS: Array[String] = ["R", "B", "Y", "G"]
const GAMES: Array[Dictionary] = [
	{"id":"tap_sprint","title":"TAP SPRINT","category":"SPEED","description":"Mash the button. Own the leaderboard.","color":Color("#29B8E8"),"duration":10},
	{"id":"reflex_rush","title":"REFLEX RUSH","category":"REACTION","description":"Wait for GO. Don't jump the gun.","color":Color("#FF667F"),"duration":0},
	{"id":"memory_grid","title":"MEMORY GRID","category":"BRAIN","description":"Remember the order. Repeat it perfectly.","color":Color("#9875EF"),"duration":0},
	{"id":"mini_racers","title":"MINI RACERS","category":"RACING","description":"Tap for speed. Beat them to the line.","color":Color("#FFAA45"),"duration":12},
	{"id":"dodge_arena","title":"DODGE ARENA","category":"SURVIVAL","description":"Dodge on the signal. Last player wins.","color":Color("#46C99B"),"duration":0},
	{"id":"target_rush","title":"TARGET RUSH","category":"ACCURACY","description":"Hit the matching color before time runs out.","color":Color("#F07CC3"),"duration":12}
]

var screen_name := "home"
var player_count := 2
var tournament_round_count := 5
var tournament_active := false
var round_index := 1
var tournament_scores: Array[int] = [0, 0, 0, 0]
var recent_games: Array[String] = []
var current_game := "tap_sprint"
var player_data: Array[Dictionary] = []
var player_status: Array[String] = []
var result_scores: Array[float] = []
var result_points: Array[int] = []
var game_time_left := 0.0
var phase := "idle"
var phase_timer := 0.0
var game_elapsed := 0.0
var reflex_start_ms := 0
var target_index := 0
var memory_sequence: Array[int] = []
var active_memory_player := 0
var dodge_wave := 0
var last_winner := ""
var wiggle := 0.0

func _ready() -> void:
	randomize()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	_load_local_save()
	queue_redraw()

func _process(delta: float) -> void:
	wiggle += delta
	if screen_name == "game":
		_tick_game(delta)
		queue_redraw()

func _gui_input(event: InputEvent) -> void:
	var scale_to_design := Vector2(SW, SH) / get_viewport_rect().size
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_handle_tap(event.position * scale_to_design)
		accept_event()
	elif event is InputEventScreenTouch and event.pressed:
		_handle_tap(event.position * scale_to_design)
		accept_event()
	elif event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE or event.keycode == KEY_BACK:
			_go_home()
			accept_event()

func _draw() -> void:
	var size := get_viewport_rect().size
	draw_set_transform(Vector2.ZERO, 0.0, Vector2(size.x / SW, size.y / SH))
	draw_rect(Rect2(0, 0, SW, SH), BG, true)
	_draw_background_marks()
	match screen_name:
		"home": _draw_home()
		"game": _draw_game()
		"result": _draw_result()
		"final": _draw_final()
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func _draw_background_marks() -> void:
	for i in range(11):
		var x := 28.0 + float(i) * 122.0
		draw_circle(Vector2(x, 688.0), 2.0, Color("#DDE4F2"))
		draw_circle(Vector2(x + 34.0, 22.0), 2.0, Color("#DDE4F2"))

func _rr(rect: Rect2, color: Color, radius := 18) -> void:
	var box := StyleBoxFlat.new()
	box.bg_color = color
	box.set_corner_radius_all(radius)
	add_theme_stylebox_override("panel", box)
	draw_style_box(box, rect)

func _txt(value: String, x: float, y: float, size: int, color: Color = INK, width := -1.0) -> void:
	draw_string(ThemeDB.fallback_font, Vector2(x, y), value, HORIZONTAL_ALIGNMENT_LEFT, width, size, color)

func _center(value: String, x: float, y: float, width: float, size: int, color: Color = INK) -> void:
	var font := ThemeDB.fallback_font
	var measured := font.get_string_size(value, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	_txt(value, x + (width - measured) * 0.5, y, size, color)

func _pill(rect: Rect2, label: String, selected: bool, color: Color = PURPLE) -> void:
	_rr(rect, color if selected else WHITE, 14)
	_center(label, rect.position.x, rect.position.y + rect.size.y * 0.5 + 6.0, rect.size.x, 18, WHITE if selected else INK)

func _draw_home() -> void:
	_rr(Rect2(38, 28, 1204, 90), WHITE, 26)
	_rr(Rect2(56, 46, 56, 56), PURPLE, 17)
	_draw_mark(Vector2(84, 74), 1.0)
	_txt("POCKET PARTY", 128, 70, 28, INK)
	_txt("ONE PHONE. FOUR PLAYERS. INFINITE REMATCHES.", 129, 94, 12, MUTED)
	_rr(Rect2(1050, 48, 164, 45), Color("#EDF0FF"), 16)
	_center("OFFLINE PLAY", 1050, 76, 164, 14, PURPLE)

	_rr(Rect2(38, 138, 296, 524), WHITE, 24)
	_txt("SET UP YOUR", 58, 174, 14, MUTED)
	_txt("PARTY", 58, 207, 30, INK)
	_txt("HOW MANY PLAYERS?", 58, 228, 12, MUTED)
	for i in range(4):
		var rect := _home_player_rect(i)
		_pill(rect, str(i + 1), player_count == i + 1, PLAYER_COLORS[i] if player_count == i + 1 else PURPLE)
		if player_count != i + 1:
			_center("P%d" % (i + 1), rect.position.x, rect.position.y + 70, rect.size.x, 10, MUTED)
	_txt("TOURNAMENT LENGTH", 58, 318, 12, MUTED)
	_pill(_home_round_rect(0), "5 ROUNDS", tournament_round_count == 5, PURPLE)
	_pill(_home_round_rect(1), "10 ROUNDS", tournament_round_count == 10, PURPLE)
	_rr(Rect2(54, 396, 264, 68), YELLOW, 20)
	_center("START TOURNAMENT", 54, 425, 264, 17, INK)
	_center("AUTO-SELECT GAMES", 54, 447, 264, 11, INK)
	_rr(Rect2(54, 483, 264, 154), Color("#F4F6FD"), 18)
	_txt("QUICK PLAY", 70, 510, 14, INK)
	_txt("Tap any game card to jump straight in.", 70, 532, 11, MUTED)
	_rr(Rect2(70, 551, 100, 35), Color("#E1F7FE"), 11)
	_center("6 GAMES", 70, 574, 100, 12, Color("#1689B6"))
	_rr(Rect2(180, 551, 122, 35), Color("#EEEAFE"), 11)
	_center("NO WI-FI", 180, 574, 122, 12, PURPLE)
	_center("READY, PLAYER %d?" % player_count, 54, 619, 264, 12, MUTED)

	_txt("PICK YOUR GAME", 360, 124, 19, INK)
	_txt("Simple controls. Big rematches.", 548, 124, 13, MUTED)
	for i in range(GAMES.size()):
		_draw_game_card(i, _home_game_rect(i))

func _draw_mark(center: Vector2, scale_factor: float) -> void:
	var s := scale_factor
	draw_rect(Rect2(center.x - 17*s, center.y - 3*s, 34*s, 7*s), WHITE, true)
	draw_rect(Rect2(center.x - 4*s, center.y - 16*s, 7*s, 34*s), WHITE, true)
	draw_circle(center + Vector2(12*s, -13*s), 4*s, YELLOW)
	draw_circle(center + Vector2(-13*s, 14*s), 4*s, Color("#FF7C91"))

func _draw_game_card(index: int, rect: Rect2) -> void:
	var data: Dictionary = GAMES[index]
	var col: Color = data["color"]
	_rr(Rect2(rect.position.x + 3, rect.position.y + 5, rect.size.x, rect.size.y), Color("#DDE3F0"), 22)
	_rr(rect, WHITE, 22)
	_rr(Rect2(rect.position.x + 12, rect.position.y + 12, rect.size.x - 24, 118), col.lightened(0.65), 17)
	_draw_game_icon(str(data["id"]), rect.position + Vector2(rect.size.x * 0.5, rect.position.y + 71), col)
	_rr(Rect2(rect.position.x + 14, rect.position.y + 140, 100, 23), col.lightened(0.72), 9)
	_txt(str(data["category"]), rect.position.x + 23, rect.position.y + 156, 10, col.darkened(0.32))
	_txt(str(data["title"]), rect.position.x + 14, rect.position.y + 184, 18, INK)
	_txt(str(data["description"]), rect.position.x + 14, rect.position.y + 204, 10, MUTED, rect.size.x - 28)

func _draw_game_icon(id: String, center: Vector2, col: Color) -> void:
	match id:
		"tap_sprint":
			for i in range(5):
				draw_circle(center + Vector2(-48 + i * 23, 4), 9 + (i % 2) * 2, col if i != 2 else YELLOW)
			draw_line(center + Vector2(-49, 28), center + Vector2(48, 28), col.darkened(0.2), 5, true)
		"reflex_rush":
			draw_circle(center, 36, WHITE)
			draw_circle(center, 28, col)
			draw_circle(center, 12, YELLOW)
			draw_line(center + Vector2(0, 0), center + Vector2(15, -19), INK, 5, true)
		"memory_grid":
			for r in range(2):
				for c in range(2):
					var i := r * 2 + c
					_rr(Rect2(center.x - 36 + c * 42, center.y - 34 + r * 42, 32, 32), BUTTON_COLORS[i], 8)
		"mini_racers":
			_rr(Rect2(center.x - 51, center.y - 32, 102, 64), Color("#FFFFFF"), 13)
			draw_line(center + Vector2(-44, 0), center + Vector2(44, 0), col, 3, true)
			_rr(Rect2(center.x - 31, center.y - 20, 29, 17), col, 5)
			_rr(Rect2(center.x + 5, center.y + 4, 29, 17), Color("#65718C"), 5)
		"dodge_arena":
			draw_circle(center, 39, WHITE)
			draw_circle(center, 28, col)
			draw_circle(center + Vector2(-25, -18), 7, Color("#FF657D"))
			draw_circle(center + Vector2(23, -20), 7, YELLOW)
			draw_circle(center + Vector2(0, 25), 7, Color("#28B8E8"))
		"target_rush":
			draw_circle(center, 40, WHITE)
			draw_circle(center, 29, col)
			draw_circle(center, 18, WHITE)
			draw_circle(center, 8, YELLOW)

func _draw_game() -> void:
	var data := _get_game_data(current_game)
	_rr(Rect2(24, 24, 122, 48), WHITE, 15)
	_center("← BACK", 24, 54, 122, 15, INK)
	_center(str(data["title"]), 220, 57, 840, 28, INK)
	_center("ROUND %d%s" % [round_index, "  /  %d" % tournament_round_count if tournament_active else "  /  QUICK PLAY"], 220, 83, 840, 13, MUTED)
	_rr(Rect2(48, 112, 1184, 380), WHITE, 24)
	_draw_game_stage()
	for p in range(player_count):
		_draw_player_panel(p)
	if game_time_left > 0.0 and current_game in ["tap_sprint", "mini_racers", "target_rush"]:
		_rr(Rect2(548, 126, 184, 44), Color("#F0F2FB"), 14)
		_center("%.1f SEC" % game_time_left, 548, 154, 184, 15, PURPLE)

func _draw_game_stage() -> void:
	var center := Vector2(640, 300)
	match current_game:
		"tap_sprint":
			_center("TAP AS FAST AS YOU CAN!", 150, 190, 980, 19, MUTED)
			for i in range(5):
				var rad := 24.0 + float((i + int(wiggle * 8.0)) % 3) * 3.0
				draw_circle(center + Vector2(-150 + i * 75, 28), rad, PLAYER_COLORS[i % PLAYER_COLORS.size()])
			_rr(Rect2(470, 337, 340, 46), Color("#F1F4FC"), 15)
			_center("THE MOST TAPS WINS", 470, 366, 340, 15, INK)
		"reflex_rush":
			var go := phase == "reflex_go"
			var c := Color("#45C994") if go else Color("#FF657D")
			draw_circle(center, 88, c.lightened(0.55))
			draw_circle(center, 67, c)
			_center("GO!" if go else "WAIT...", center.x - 110, center.y + 10, 220, 38, WHITE)
			_center("Tap when the light turns green.", 260, 410, 760, 16, MUTED)
		"memory_grid":
			_center("WATCH THE PATTERN, THEN REPEAT IT", 150, 190, 980, 18, MUTED)
			for c in range(4):
				var rect := Rect2(490 + c * 76, 225, 60, 60)
				_rr(rect, BUTTON_COLORS[memory_sequence[c]], 13)
				if phase == "memory_show":
					_center(str(c + 1), rect.position.x, rect.position.y + 39, rect.size.x, 19, WHITE)
			_center("PLAYER %d'S TURN" % (active_memory_player + 1) if phase == "memory_input" else "MEMORIZE THE COLORS", 350, 340, 580, 19, PURPLE)
		"mini_racers":
			_center("TAP YOUR PANEL TO BOOST", 150, 190, 980, 18, MUTED)
			for p in range(player_count):
				var y := 230.0 + p * 48.0
				_rr(Rect2(205, y, 870, 31), Color("#E9EDF6"), 10)
				var progress := clampf(float(player_data[p]["progress"]) / 48.0, 0.0, 1.0)
				_rr(Rect2(205, y, maxf(30.0, 870.0 * progress), 31), PLAYER_COLORS[p], 10)
				_center("P%d" % (p + 1), 110, y + 22, 70, 14, INK)
			draw_line(Vector2(1088, 218), Vector2(1088, 425), INK, 4, true)
		"dodge_arena":
			var live := phase == "dodge_live"
			draw_circle(center, 86, Color("#E5F7F0"))
			draw_circle(center, 61, Color("#46C99B") if live else Color("#F3C65D"))
			_center("DODGE!" if live else "READY?", center.x - 120, center.y + 10, 240, 30, WHITE)
			_center("WAVE %d / 8" % (dodge_wave + 1), 420, 410, 440, 15, MUTED)
		"target_rush":
			var col: Color = BUTTON_COLORS[target_index]
			draw_circle(center, 72, col.lightened(0.5))
			draw_circle(center, 53, col)
			_center(BUTTON_LABELS[target_index], center.x - 40, center.y + 15, 80, 38, WHITE)
			_center("MATCH THE COLOR ON YOUR PANEL", 260, 410, 760, 16, MUTED)

func _draw_player_panel(p: int) -> void:
	var rect := _player_panel_rect(p)
	var col: Color = PLAYER_COLORS[p]
	_rr(rect, col.lightened(0.70), 18)
	_rr(Rect2(rect.position.x + 6, rect.position.y + 6, rect.size.x - 12, 39), col, 12)
	_txt("PLAYER %d" % (p + 1), rect.position.x + 15, rect.position.y + 31, 14, WHITE)
	_txt(str(player_status[p]), rect.position.x + 15, rect.position.y + 62, 11, INK)
	if current_game in ["memory_grid", "target_rush"]:
		for c in range(4):
			var button := _color_action_rect(p, c)
			_rr(button, BUTTON_COLORS[c], 10)
			_center(BUTTON_LABELS[c], button.position.x, button.position.y + 35, button.size.x, 14, INK if c == 2 else WHITE)
	else:
		var button := _player_action_rect(p)
		_rr(button, YELLOW if current_game != "reflex_rush" else (Color("#45C994") if phase == "reflex_go" else Color("#FFCCD5")), 13)
		var label := "TAP!" if current_game in ["tap_sprint", "mini_racers"] else ("DODGE!" if current_game == "dodge_arena" else "REACT!")
		_center(label, button.position.x, button.position.y + 36, button.size.x, 18, INK)
	if tournament_active:
		_txt("TOUR: %d PTS" % tournament_scores[p], rect.position.x + 15, rect.position.y + rect.size.y - 8, 10, MUTED)

func _draw_result() -> void:
	_rr(Rect2(245, 44, 790, 620), WHITE, 30)
	_rr(Rect2(275, 76, 730, 100), Color("#F0EEFF"), 22)
	_center("ROUND COMPLETE!", 275, 116, 730, 27, PURPLE)
	_center(str(_get_game_data(current_game)["title"]), 275, 146, 730, 14, MUTED)
	var order := _sorted_players(result_scores)
	for i in range(order.size()):
		var p := order[i]
		var y := 218.0 + float(i) * 67.0
		_rr(Rect2(300, y, 680, 54), PLAYER_COLORS[p].lightened(0.72), 15)
		_rr(Rect2(312, y + 7, 42, 40), PLAYER_COLORS[p], 11)
		_center(str(i + 1), 312, y + 33, 42, 20, WHITE)
		_txt("PLAYER %d" % (p + 1), 374, y + 32, 17, INK)
		_txt(_score_label(p), 620, y + 32, 14, MUTED)
		if tournament_active:
			_rr(Rect2(878, y + 7, 82, 40), YELLOW, 12)
			_center("+%d PTS" % result_points[p], 878, y + 32, 82, 12, INK)
	_rr(Rect2(362, 555, 250, 64), YELLOW, 18)
	_center("NEXT ROUND" if tournament_active else "REMATCH", 362, 594, 250, 17, INK)
	_rr(Rect2(650, 555, 250, 64), Color("#EDF0F8"), 18)
	_center("FINAL SCORES" if tournament_active else "HOME", 650, 594, 250, 17, INK)

func _draw_final() -> void:
	_rr(Rect2(250, 42, 780, 630), WHITE, 30)
	draw_circle(Vector2(640, 150), 58, YELLOW)
	_center("★", 600, 167, 80, 48, INK)
	_center("TOURNAMENT CHAMPION", 300, 245, 680, 27, PURPLE)
	_center(last_winner, 300, 286, 680, 20, INK)
	var order := _sorted_players(tournament_scores.map(func(v): return float(v)))
	for i in range(order.size()):
		var p := order[i]
		var y := 330.0 + float(i) * 42.0
		_rr(Rect2(365, y, 550, 34), PLAYER_COLORS[p].lightened(0.72), 10)
		_txt("%d. PLAYER %d" % [i + 1, p + 1], 382, y + 23, 13, INK)
		_txt("%d POINTS" % tournament_scores[p], 760, y + 23, 13, PURPLE)
	_rr(Rect2(362, 570, 250, 64), YELLOW, 18)
	_center("PLAY AGAIN", 362, 609, 250, 17, INK)
	_rr(Rect2(650, 570, 250, 64), Color("#EDF0F8"), 18)
	_center("HOME", 650, 609, 250, 17, INK)

# -----------------------------------------------------------------------------
# Navigation / hit testing
# -----------------------------------------------------------------------------
func _home_player_rect(i: int) -> Rect2:
	return Rect2(58.0 + float(i) * 62.0, 242.0, 52.0, 52.0)

func _home_round_rect(i: int) -> Rect2:
	return Rect2(58.0 + float(i) * 130.0, 334.0, 112.0, 42.0)

func _home_start_rect() -> Rect2:
	return Rect2(54.0, 396.0, 264.0, 68.0)

func _home_game_rect(i: int) -> Rect2:
	return Rect2(360.0 + float(i % 3) * 292.0, 160.0 + float(int(i / 3)) * 236.0, 280.0, 218.0)

func _player_panel_rect(i: int) -> Rect2:
	var gap := 8.0
	var width := (1184.0 - gap * float(player_count - 1)) / float(player_count)
	if player_count == 1:
		width = 430.0
		return Rect2((SW - width) / 2.0, 520.0, width, 148.0)
	return Rect2(48.0 + float(i) * (width + gap), 520.0, width, 148.0)

func _player_action_rect(i: int) -> Rect2:
	var panel := _player_panel_rect(i)
	return Rect2(panel.position.x + 10.0, panel.position.y + 72.0, panel.size.x - 20.0, 53.0)

func _color_action_rect(i: int, c: int) -> Rect2:
	var panel := _player_panel_rect(i)
	var pad := 9.0
	var gap := 4.0
	var w := (panel.size.x - pad * 2.0 - gap * 3.0) / 4.0
	return Rect2(panel.position.x + pad + float(c) * (w + gap), panel.position.y + 76.0, w, 48.0)

func _handle_tap(pos: Vector2) -> void:
	match screen_name:
		"home": _home_tap(pos)
		"game": _game_tap(pos)
		"result": _result_tap(pos)
		"final": _final_tap(pos)
	queue_redraw()

func _home_tap(pos: Vector2) -> void:
	for i in range(4):
		if _home_player_rect(i).has_point(pos):
			player_count = i + 1
			_save_local_save()
			return
	for i in range(2):
		if _home_round_rect(i).has_point(pos):
			tournament_round_count = 5 if i == 0 else 10
			_save_local_save()
			return
	if _home_start_rect().has_point(pos):
		_begin_tournament()
		return
	for i in range(GAMES.size()):
		if _home_game_rect(i).has_point(pos):
			_start_quick_game(str(GAMES[i]["id"]))
			return

func _game_tap(pos: Vector2) -> void:
	if Rect2(24, 24, 122, 48).has_point(pos):
		_go_home()
		return
	if pos.y < 520.0:
		return
	for p in range(player_count):
		if not _player_panel_rect(p).has_point(pos):
			continue
		if current_game in ["memory_grid", "target_rush"]:
			for c in range(4):
				if _color_action_rect(p, c).has_point(pos):
					_color_action(p, c)
					return
		elif _player_action_rect(p).has_point(pos):
			_player_action(p)
			return

func _result_tap(pos: Vector2) -> void:
	if Rect2(362, 555, 250, 64).has_point(pos):
		if tournament_active:
			round_index += 1
			_start_next_tournament_round()
		else:
			_start_quick_game(current_game)
	elif Rect2(650, 555, 250, 64).has_point(pos):
		if tournament_active:
			_show_final()
		else:
			_go_home()

func _final_tap(pos: Vector2) -> void:
	if Rect2(362, 570, 250, 64).has_point(pos):
		_begin_tournament()
	elif Rect2(650, 570, 250, 64).has_point(pos):
		_go_home()

func _start_quick_game(game_id: String) -> void:
	tournament_active = false
	_start_game(game_id)

func _begin_tournament() -> void:
	tournament_active = true
	tournament_scores = [0, 0, 0, 0]
	round_index = 1
	recent_games.clear()
	_start_next_tournament_round()

func _start_next_tournament_round() -> void:
	if round_index > tournament_round_count:
		_show_final()
		return
	var choices: Array[String] = []
	for data in GAMES:
		var id := str(data["id"])
		if not recent_games.has(id):
			choices.append(id)
	if choices.is_empty():
		for data in GAMES:
			choices.append(str(data["id"]))
	var chosen := choices[randi_range(0, choices.size() - 1)]
	recent_games.append(chosen)
	if recent_games.size() > 2:
		recent_games.pop_front()
	_start_game(chosen)

func _start_game(game_id: String) -> void:
	current_game = game_id
	screen_name = "game"
	game_elapsed = 0.0
	game_time_left = 10.0
	phase_timer = 0.0
	phase = "playing"
	reflex_start_ms = 0
	target_index = randi_range(0, 3)
	memory_sequence.clear()
	for j in range(4):
		memory_sequence.append(randi_range(0, 3))
	active_memory_player = 0
	dodge_wave = 0
	player_data.clear()
	player_status.clear()
	for p in range(player_count):
		player_data.append({"taps":0,"reaction_ms":-1,"responded":false,"progress":0,"hits":0,"misses":0,"acted":false,"raw":0.0,"input_index":0,"done":false})
		player_status.append("READY")
	match current_game:
		"tap_sprint":
			game_time_left = 10.0
		"mini_racers":
			game_time_left = 12.0
		"target_rush":
			game_time_left = 12.0
			phase = "target"
			phase_timer = 0.75
		"reflex_rush":
			phase = "reflex_wait"
			phase_timer = randf_range(1.4, 3.5)
		"memory_grid":
			phase = "memory_show"
			phase_timer = 2.8
		"dodge_arena":
			phase = "dodge_ready"
			phase_timer = randf_range(0.8, 1.5)
	_save_local_save()

func _go_home() -> void:
	screen_name = "home"
	phase = "idle"
	_save_local_save()

func _tick_game(delta: float) -> void:
	game_elapsed += delta
	match current_game:
		"tap_sprint", "mini_racers":
			game_time_left = maxf(0.0, game_time_left - delta)
			if game_time_left <= 0.0:
				_finish_round()
		"target_rush":
			game_time_left = maxf(0.0, game_time_left - delta)
			phase_timer -= delta
			if phase_timer <= 0.0:
				target_index = randi_range(0, 3)
				phase_timer = 0.72
			if game_time_left <= 0.0:
				_finish_round()
		"reflex_rush":
			phase_timer -= delta
			if phase == "reflex_wait" and phase_timer <= 0.0:
				phase = "reflex_go"
				phase_timer = 2.8
				reflex_start_ms = Time.get_ticks_msec()
				for p in range(player_count):
					if not player_data[p]["responded"]:
						player_status[p] = "TAP NOW!"
				if _all_reflex_responded():
					_finish_round()
			elif phase == "reflex_go":
				if _all_reflex_responded() or phase_timer <= 0.0:
					for p in range(player_count):
						if not player_data[p]["responded"]:
							player_data[p]["responded"] = true
							player_data[p]["reaction_ms"] = -1
							player_status[p] = "TOO SLOW!"
					_finish_round()
		"memory_grid":
			if phase == "memory_show":
				phase_timer -= delta
				if phase_timer <= 0.0:
					phase = "memory_input"
					active_memory_player = 0
					player_status[0] = "YOUR TURN!"
			elif phase == "memory_switch":
				phase_timer -= delta
				if phase_timer <= 0.0:
					active_memory_player += 1
					if active_memory_player >= player_count:
						_finish_round()
					else:
						phase = "memory_input"
						player_status[active_memory_player] = "YOUR TURN!"
		"dodge_arena":
			phase_timer -= delta
			if phase == "dodge_ready" and phase_timer <= 0.0:
				phase = "dodge_live"
				phase_timer = 0.65
				for p in range(player_count):
					player_data[p]["acted"] = false
					player_status[p] = "DODGE!"
			elif phase == "dodge_live" and phase_timer <= 0.0:
				for p in range(player_count):
					if player_data[p]["acted"]:
						player_data[p]["hits"] = int(player_data[p]["hits"]) + 1
						player_status[p] = "NICE DODGE!"
					else:
						player_data[p]["misses"] = int(player_data[p]["misses"]) + 1
						player_status[p] = "MISSED!"
				dodge_wave += 1
				if dodge_wave >= 8:
					_finish_round()
				else:
					phase = "dodge_ready"
					phase_timer = randf_range(0.75, 1.45)
	queue_redraw()

func _player_action(p: int) -> void:
	if p < 0 or p >= player_count or screen_name != "game":
		return
	match current_game:
		"tap_sprint":
			player_data[p]["taps"] = int(player_data[p]["taps"]) + 1
			player_status[p] = "%d TAPS" % int(player_data[p]["taps"])
		"mini_racers":
			player_data[p]["progress"] = int(player_data[p]["progress"]) + 1
			player_status[p] = "BOOST! %d" % int(player_data[p]["progress"])
		"reflex_rush":
			if player_data[p]["responded"]:
				return
			player_data[p]["responded"] = true
			if phase == "reflex_wait":
				player_data[p]["reaction_ms"] = -1
				player_status[p] = "FALSE START!"
			else:
				player_data[p]["reaction_ms"] = Time.get_ticks_msec() - reflex_start_ms
				player_status[p] = "%d ms" % int(player_data[p]["reaction_ms"])
				if _all_reflex_responded():
					_finish_round()
		"dodge_arena":
			if phase == "dodge_live" and not player_data[p]["acted"]:
				player_data[p]["acted"] = true
				player_status[p] = "NICE!"
			elif phase == "dodge_ready":
				player_data[p]["misses"] = int(player_data[p]["misses"]) + 1
				player_status[p] = "TOO EARLY!"
	queue_redraw()

func _color_action(p: int, c: int) -> void:
	if p < 0 or p >= player_count or c < 0 or c >= 4:
		return
	if current_game == "target_rush":
		if c == target_index:
			player_data[p]["hits"] = int(player_data[p]["hits"]) + 1
			player_status[p] = "HIT! %d" % int(player_data[p]["hits"])
		else:
			player_data[p]["misses"] = int(player_data[p]["misses"]) + 1
			player_status[p] = "MISS!"
	elif current_game == "memory_grid" and phase == "memory_input" and p == active_memory_player and not player_data[p]["done"]:
		var idx := int(player_data[p]["input_index"])
		if idx < memory_sequence.size() and c == memory_sequence[idx]:
			idx += 1
			player_data[p]["input_index"] = idx
			player_status[p] = "MATCH %d/%d" % [idx, memory_sequence.size()]
			if idx >= memory_sequence.size():
				player_data[p]["raw"] = float(idx)
				player_data[p]["done"] = true
				player_status[p] = "PERFECT MEMORY!"
				phase = "memory_switch"
				phase_timer = 0.65
		else:
			player_data[p]["raw"] = float(idx)
			player_data[p]["done"] = true
			player_status[p] = "SCORE: %d" % idx
			phase = "memory_switch"
			phase_timer = 0.65
	queue_redraw()

func _all_reflex_responded() -> bool:
	for p in range(player_count):
		if not player_data[p]["responded"]:
			return false
	return true

func _raw_scores() -> Array[float]:
	var scores: Array[float] = []
	for p in range(player_count):
		var data: Dictionary = player_data[p]
		var value := 0.0
		match current_game:
			"tap_sprint": value = float(data["taps"])
			"reflex_rush": value = 10000.0 - float(data["reaction_ms"]) if int(data["reaction_ms"]) >= 0 else -1000.0
			"memory_grid": value = float(data["raw"])
			"mini_racers": value = float(data["progress"])
			"dodge_arena": value = float(int(data["hits"]) * 2 - int(data["misses"]))
			"target_rush": value = float(int(data["hits"]) * 2 - int(data["misses"]))
		scores.append(value)
	return scores

func _award_points(scores: Array[float]) -> void:
	result_points.clear()
	for p in range(player_count):
		var rank := 0
		for other in range(player_count):
			if scores[other] > scores[p]:
				rank += 1
		var pts := 3 if rank == 0 else (2 if rank == 1 else (1 if rank == 2 else 0))
		result_points.append(pts)
		if tournament_active:
			tournament_scores[p] += pts

func _finish_round() -> void:
	if screen_name != "game":
		return
	screen_name = "result"
	result_scores = _raw_scores()
	_award_points(result_scores)
	queue_redraw()

func _show_final() -> void:
	screen_name = "final"
	var order := _sorted_players(tournament_scores.map(func(v): return float(v)))
	last_winner = "PLAYER %d WINS!" % (order[0] + 1) if not order.is_empty() else "CHAMPION!"
	queue_redraw()

func _sorted_players(scores: Array[float]) -> Array[int]:
	var order: Array[int] = []
	for p in range(scores.size()):
		order.append(p)
	order.sort_custom(func(a: int, b: int) -> bool: return scores[a] > scores[b])
	return order

func _get_game_data(id: String) -> Dictionary:
	for data in GAMES:
		if str(data["id"]) == id:
			return data
	return GAMES[0]

func _score_label(p: int) -> String:
	var data: Dictionary = player_data[p] if p < player_data.size() else {}
	match current_game:
		"tap_sprint": return "%d taps" % int(data.get("taps", 0))
		"reflex_rush": return ("%d ms" % int(data.get("reaction_ms", -1))) if int(data.get("reaction_ms", -1)) >= 0 else "False start / too slow"
		"memory_grid": return "%d / 4 remembered" % int(data.get("raw", 0))
		"mini_racers": return "%d boosts" % int(data.get("progress", 0))
		"dodge_arena": return "%d successful dodges" % int(data.get("hits", 0))
		"target_rush": return "%d hits · %d misses" % [int(data.get("hits", 0)), int(data.get("misses", 0))]
	return "Finished"

func _save_local_save() -> void:
	var file := FileAccess.open("user://settings.cfg", FileAccess.WRITE)
	if file:
		file.store_var({"player_count": player_count, "rounds": tournament_round_count})

func _load_local_save() -> void:
	if not FileAccess.file_exists("user://settings.cfg"):
		return
	var file := FileAccess.open("user://settings.cfg", FileAccess.READ)
	if file:
		var saved: Variant = file.get_var()
		if saved is Dictionary:
			player_count = clampi(int(saved.get("player_count", 2)), 1, 4)
			tournament_round_count = 10 if int(saved.get("rounds", 5)) == 10 else 5
