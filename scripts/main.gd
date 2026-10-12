extends Control

# Pocket Party: offline-first local party-game prototype.
# All art is drawn in code so the project stays lightweight and editable.

const SW := 1280.0
const SH := 720.0
const INK := Color("#17233E")
const MUTED := Color("#69758D")
const BG := Color("#F4F7FF")
const WHITE := Color("#FFFFFF")
const PURPLE := Color("#5A4AE8")
const YELLOW := Color("#FFDF62")
const PLAYER_COLORS: Array[Color] = [Color("#22B8E8"), Color("#FF6888"), Color("#39C993"), Color("#FFAF48")]
const BUTTON_COLORS: Array[Color] = [Color("#FF657D"), Color("#28B8E8"), Color("#FFD34E"), Color("#43C99A")]
const BUTTON_LABELS: Array[String] = ["R", "B", "Y", "G"]
const BLOCK_SHAPES := [
	[Vector2i(0,0)],
	[Vector2i(0,0),Vector2i(1,0),Vector2i(0,1),Vector2i(1,1)],
	[Vector2i(0,0),Vector2i(1,0),Vector2i(2,0)],
	[Vector2i(0,0),Vector2i(0,1),Vector2i(0,2)],
	[Vector2i(0,0),Vector2i(1,0),Vector2i(2,0),Vector2i(1,1)],
	[Vector2i(0,0),Vector2i(0,1),Vector2i(1,1),Vector2i(2,1)],
	[Vector2i(0,0),Vector2i(1,0),Vector2i(1,1),Vector2i(2,1)],
	[Vector2i(0,0),Vector2i(1,0),Vector2i(2,0),Vector2i(3,0)],
	[Vector2i(0,0),Vector2i(0,1),Vector2i(0,2),Vector2i(1,2)],
	[Vector2i(1,0),Vector2i(0,1),Vector2i(1,1),Vector2i(2,1)]
]
const GAMES: Array[Dictionary] = [
	{"id":"tap_sprint","title":"TAP SPRINT","category":"SPEED","description":"Mash the button. Own the leaderboard.","color":Color("#29B8E8"),"duration":10},
	{"id":"reflex_rush","title":"REFLEX RUSH","category":"REACTION","description":"Wait for GO. Don't jump the gun.","color":Color("#FF667F"),"duration":0},
	{"id":"memory_grid","title":"MEMORY GRID","category":"BRAIN","description":"Remember the order. Repeat it perfectly.","color":Color("#9875EF"),"duration":0},
	{"id":"mini_racers","title":"MINI RACERS","category":"RACING","description":"Hold to drive. Use nitro to reach the finish.","color":Color("#FFAA45"),"duration":12},
	{"id":"dodge_arena","title":"DODGE ARENA","category":"SURVIVAL","description":"Dodge on the signal. Last player wins.","color":Color("#46C99B"),"duration":0},
	{"id":"target_rush","title":"TARGET RUSH","category":"ACCURACY","description":"Hit the matching color before time runs out.","color":Color("#F07CC3"),"duration":12},
	{"id":"block_battle","title":"BLOCK BATTLE","category":"PUZZLE","description":"Place shapes. Clear lines. Beat every score.","color":Color("#4D8DFF"),"duration":35},
	{"id":"orb_dash","title":"ORB DASH","category":"MOVEMENT","description":"Use your control stick. Grab gems. Chase the lead.","color":Color("#7D65F2"),"duration":30}
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
var memory_show_index := -1
var active_memory_player := 0
var dodge_wave := 0
var last_winner := ""
var wiggle := 0.0
var race_mouse_player := -1
var race_touch_players: Dictionary = {}
var orb_mouse_player := -1
var orb_touch_players: Dictionary = {}
var block_mouse_drag_piece := -1
var block_touch_pieces: Dictionary = {}
var active_block_player := 0
var selected_block_piece := 0
var orb_target := Vector2(640.0, 300.0)

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
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		var mouse_pos := event.position * scale_to_design
		if event.pressed:
			_handle_tap(mouse_pos)
			block_mouse_drag_piece = _block_piece_at(mouse_pos) if screen_name == "game" and current_game == "block_battle" else -1
			race_mouse_player = -1
			orb_mouse_player = -1
			if screen_name == "game" and current_game == "mini_racers":
				race_mouse_player = _race_player_at(mouse_pos)
				if race_mouse_player >= 0:
					player_data[race_mouse_player]["throttle"] = true
			elif screen_name == "game" and current_game == "orb_dash":
				orb_mouse_player = _orb_player_at(mouse_pos)
				if orb_mouse_player >= 0:
					_update_orb_joystick(orb_mouse_player, mouse_pos)
		else:
			if block_mouse_drag_piece >= 0 and screen_name == "game" and current_game == "block_battle":
				var drop_cell := _block_cell_at(mouse_pos)
				if drop_cell.x >= 0:
					selected_block_piece = block_mouse_drag_piece
					_place_block_piece(drop_cell.y, drop_cell.x)
			block_mouse_drag_piece = -1
			if race_mouse_player >= 0 and race_mouse_player < player_data.size():
				player_data[race_mouse_player]["throttle"] = false
			if orb_mouse_player >= 0 and orb_mouse_player < player_data.size():
				player_data[orb_mouse_player]["joystick"] = Vector2.ZERO
			race_mouse_player = -1
			orb_mouse_player = -1
		queue_redraw()
		accept_event()
	elif event is InputEventMouseMotion:
		if orb_mouse_player >= 0 and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
			_update_orb_joystick(orb_mouse_player, event.position * scale_to_design)
			queue_redraw()
	elif event is InputEventScreenTouch:
		var touch_pos := event.position * scale_to_design
		if event.pressed:
			_handle_tap(touch_pos)
			if screen_name == "game" and current_game == "block_battle":
				var touched_piece := _block_piece_at(touch_pos)
				if touched_piece >= 0:
					block_touch_pieces[event.index] = touched_piece
			if screen_name == "game" and current_game == "mini_racers":
				var touch_player := _race_player_at(touch_pos)
				if touch_player >= 0:
					race_touch_players[event.index] = touch_player
					player_data[touch_player]["throttle"] = true
			elif screen_name == "game" and current_game == "orb_dash":
				var orb_player := _orb_player_at(touch_pos)
				if orb_player >= 0:
					orb_touch_players[event.index] = orb_player
					_update_orb_joystick(orb_player, touch_pos)
		else:
			if block_touch_pieces.has(event.index):
				var piece_index: int = int(block_touch_pieces[event.index])
				block_touch_pieces.erase(event.index)
				var drop_cell := _block_cell_at(touch_pos)
				if drop_cell.x >= 0 and screen_name == "game" and current_game == "block_battle":
					selected_block_piece = piece_index
					_place_block_piece(drop_cell.y, drop_cell.x)
			if race_touch_players.has(event.index):
				var released_player: int = int(race_touch_players[event.index])
				race_touch_players.erase(event.index)
				_sync_race_throttle(released_player)
			if orb_touch_players.has(event.index):
				var released_orb: int = int(orb_touch_players[event.index])
				orb_touch_players.erase(event.index)
				_sync_orb_joystick(released_orb)
		queue_redraw()
		accept_event()
	elif event is InputEventScreenDrag:
		if orb_touch_players.has(event.index):
			_update_orb_joystick(int(orb_touch_players[event.index]), event.position * scale_to_design)
			queue_redraw()
	elif event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE or event.keycode == KEY_BACK:
			if screen_name == "game":
				_go_to_select()
			else:
				_go_home()
			accept_event()

func _draw() -> void:
	var size := get_viewport_rect().size
	draw_set_transform(Vector2.ZERO, 0.0, Vector2(size.x / SW, size.y / SH))
	draw_rect(Rect2(0, 0, SW, SH), BG, true)
	_draw_background_marks()
	match screen_name:
		"home": _draw_home()
		"select": _draw_select()
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

	# Hero panel
	_rr(Rect2(38, 138, 704, 524), Color("#4E40C9"), 28)
	draw_circle(Vector2(682, 190), 128, Color("#FFFFFF14"))
	draw_circle(Vector2(678, 191), 86, Color("#FFFFFF16"))
	draw_circle(Vector2(88, 615), 110, Color("#FFFFFF10"))
	_txt("THE LIVING ROOM ARCADE", 72, 187, 14, Color("#DCD7FF"))
	_txt("ONE PHONE.", 68, 260, 48, WHITE)
	_txt("FOUR PLAYERS.", 68, 319, 45, YELLOW)
	_txt("BIG CHAOS.", 68, 378, 48, WHITE)
	_txt("Six quick-fire mini-games. One screen.", 72, 426, 17, Color("#E3E0FF"))
	_txt("Pick your players, choose a challenge,", 72, 454, 15, Color("#E3E0FF"))
	_txt("and settle the score — no Wi-Fi needed.", 72, 478, 15, Color("#E3E0FF"))
	_rr(Rect2(72, 530, 160, 76), Color("#FFFFFF18"), 17)
	_txt("08", 91, 563, 26, YELLOW)
	_txt("MINI-GAMES", 92, 587, 11, WHITE)
	_rr(Rect2(245, 530, 160, 76), Color("#FFFFFF18"), 17)
	_txt("1–4", 264, 563, 26, YELLOW)
	_txt("PLAYERS", 265, 587, 11, WHITE)
	_rr(Rect2(418, 530, 278, 76), Color("#FFFFFF18"), 17)
	_txt("PASS THE PHONE", 438, 562, 16, WHITE)
	_txt("LET THE REMATCH BEGIN", 438, 585, 10, Color("#DCD7FF"))

	# Setup panel
	_rr(Rect2(765, 138, 477, 524), WHITE, 28)
	_txt("BUILD YOUR PARTY", 795, 184, 24, INK)
	_txt("Choose who's playing on this device.", 795, 209, 13, MUTED)
	_txt("HOW MANY PLAYERS?", 795, 237, 12, MUTED)
	for i in range(4):
		var rect := _home_player_rect(i)
		_pill(rect, str(i + 1), player_count == i + 1, PLAYER_COLORS[i] if player_count == i + 1 else PURPLE)
		_center("PLAYER %d" % (i + 1), rect.position.x - 2, rect.position.y + 88, rect.size.x + 4, 9, PLAYER_COLORS[i] if player_count == i + 1 else MUTED)
	_txt("TOURNAMENT LENGTH", 795, 360, 12, MUTED)
	_pill(_home_round_rect(0), "5 ROUNDS", tournament_round_count == 5, PURPLE)
	_pill(_home_round_rect(1), "10 ROUNDS", tournament_round_count == 10, PURPLE)
	_rr(Rect2(795, 451, 417, 78), YELLOW, 20)
	_center("PLAY  →", 795, 485, 417, 23, INK)
	_center("CHOOSE A MINI-GAME NEXT", 795, 509, 417, 11, INK)
	_txt("%d PLAYER%s READY" % [player_count, "" if player_count == 1 else "S"], 795, 562, 13, INK)
	_txt("Quick play or a random tournament.", 795, 585, 12, MUTED)
	_txt("YOUR SETTINGS ARE SAVED ON THIS DEVICE", 795, 622, 10, MUTED)

func _draw_select() -> void:
	_rr(Rect2(38, 28, 1204, 90), WHITE, 26)
	_rr(Rect2(52, 45, 164, 55), Color("#EDF0F8"), 15)
	_center("← SETUP", 52, 77, 164, 16, INK)
	_center("CHOOSE A MINI-GAME", 230, 70, 700, 27, INK)
	_center("%d PLAYER%s · PICK YOUR CHALLENGE" % [player_count, "" if player_count == 1 else "S"], 230, 94, 700, 11, MUTED)
	_rr(_select_tournament_rect(), YELLOW, 15)
	_center("RANDOM TOURNAMENT  →", _select_tournament_rect().position.x, 77, _select_tournament_rect().size.x, 13, INK)
	for i in range(GAMES.size()):
		_draw_game_card(i, _select_game_rect(i))
	_rr(Rect2(38, 621, 1204, 46), WHITE, 14)
	_center("CHOOSE A GAME TO START  ·  OR PLAY A RANDOM TOURNAMENT", 38, 649, 1204, 12, MUTED)

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
		"block_battle":
			for r in range(3):
				for c in range(3):
					if (r + c) % 2 == 0 or (r == 1 and c == 1):
						_rr(Rect2(center.x - 48 + c * 34, center.y - 46 + r * 34, 29, 29), PLAYER_COLORS[(r + c) % PLAYER_COLORS.size()], 6)
		"orb_dash":
			draw_circle(center, 38, Color("#FFFFFF"))
			draw_circle(center, 29, col)
			draw_circle(center + Vector2(-8, -9), 9, Color("#FFFFFF99"))
			draw_circle(center + Vector2(45, -27), 8, YELLOW)
			draw_circle(center + Vector2(-42, 25), 6, PLAYER_COLORS[0])

func _draw_game() -> void:
	var data := _get_game_data(current_game)
	_rr(Rect2(24, 24, 122, 48), WHITE, 15)
	_center("← GAMES", 24, 54, 122, 15, INK)
	_center(str(data["title"]), 220, 57, 840, 28, INK)
	_center("ROUND %d%s" % [round_index, "  /  %d" % tournament_round_count if tournament_active else "  /  QUICK PLAY"], 220, 83, 840, 13, MUTED)
	_rr(Rect2(48, 112, 1184, 380), WHITE, 24)
	_draw_game_stage()
	for p in range(player_count):
		_draw_player_panel(p)
	if game_time_left > 0.0 and current_game in ["tap_sprint", "mini_racers", "target_rush", "block_battle", "orb_dash"]:
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
				var memory_tile_rect := Rect2(490 + c * 76, 225, 60, 60)
				var tile_color: Color = BUTTON_COLORS[c]
				if phase == "memory_show":
					var active_tile := memory_show_index >= 0 and memory_sequence[memory_show_index] == c
					_rr(memory_tile_rect, tile_color.lightened(0.12) if active_tile else Color("#DCE2EE"), 13)
					if active_tile:
						_rr(Rect2(memory_tile_rect.position.x + 5, memory_tile_rect.position.y + 5, 50, 50), tile_color, 10)
				else:
					_rr(memory_tile_rect, tile_color, 13)
			_center("PLAYER %d'S TURN" % (active_memory_player + 1) if phase == "memory_input" else ("WATCH " + str(memory_show_index + 1) + " / " + str(memory_sequence.size()) if phase == "memory_show" else "REPEAT THE COLORS"), 350, 340, 580, 19, PURPLE)
		"mini_racers":
			_center("HOLD YOUR LANE BUTTON TO ACCELERATE", 118, 150, 425, 15, Color("#E5EAF5"))
			_rr(Rect2(82, 162, 1120, 290), Color("#B8E6C5"), 24)
			for gx in range(95, 1180, 30):
				draw_line(Vector2(gx, 168), Vector2(gx + 18, 184), Color("#90CAA3"), 2, true)
				draw_line(Vector2(gx, 430), Vector2(gx + 18, 446), Color("#90CAA3"), 2, true)
			_rr(Rect2(96, 174, 1092, 266), Color("#263047"), 20)
			draw_line(Vector2(108, 182), Vector2(1176, 182), Color("#E9EEF8"), 3, true)
			draw_line(Vector2(108, 432), Vector2(1176, 432), Color("#E9EEF8"), 3, true)
			for lane in range(1, player_count):
				var divider_lane_y := 174.0 + 266.0 * float(lane) / float(player_count)
				for dash_x in range(110, 1160, 42):
					_rr(Rect2(dash_x, divider_lane_y - 1.5, 19, 3), Color("#7A8499"), 1)
			for start_y in range(190, 425, 24):
				_rr(Rect2(160, start_y, 5, 13), YELLOW, 2)
			for finish_y in range(180, 435, 18):
				_rr(Rect2(1100, finish_y, 8, 9), WHITE if int(finish_y / 18) % 2 == 0 else INK, 1)
			_txt("START", 121, 201, 10, YELLOW)
			_txt("FINISH", 1070, 201, 10, WHITE)
			for p in range(player_count):
				var car_lane_y := 174.0 + 266.0 * (float(p) + 0.5) / float(player_count)
				var car_x := 160.0 + float(player_data[p]["progress"])
				_draw_race_car(p, Vector2(car_x, car_lane_y - 15.0), PLAYER_COLORS[p])
				_txt("P%d" % (p + 1), 113, car_lane_y + 4.0, 11, WHITE)
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
		"block_battle":
			var board: Array = player_data[active_block_player]["block_board"]
			var board_rect := Rect2(350, 150, 325, 318)
			_rr(board_rect, Color("#202D49"), 16)
			_center("PLAYER %d · %d PTS" % [active_block_player + 1, int(player_data[active_block_player]["block_score"])], 350, 145, 325, 12, PURPLE)
			for row in range(8):
				for col in range(8):
					var rect := _block_cell_rect(row, col)
					var value := int(board[row * 8 + col])
					_rr(rect, PLAYER_COLORS[value] if value >= 0 else Color("#34425F"), 4)
					if value >= 0:
						_rr(Rect2(rect.position.x + 4, rect.position.y + 3, rect.size.x - 8, 4), Color("#FFFFFF66"), 2)
			_center("SELECT A SHAPE, THEN TAP THE BOARD", 700, 190, 500, 14, MUTED)
			var pieces: Array = player_data[active_block_player]["block_pieces"]
			for i in range(pieces.size()):
				var piece: Dictionary = pieces[i]
				var rect := _block_piece_rect(i)
				var chosen := i == selected_block_piece
				_rr(rect, Color("#F0EDFF") if chosen else WHITE, 15)
				draw_rect(rect, PURPLE if chosen else Color("#E2E7F2"), false, 2.0)
				_center("SELECTED" if chosen else ("PLACED" if bool(piece["used"]) else "SHAPE %d" % (i + 1)), rect.position.x, rect.position.y + 20, rect.size.x, 10, PURPLE if chosen else MUTED)
				if not bool(piece["used"]):
					var cells: Array = piece["cells"]
					var color_index := int(piece["color_index"])
					for cell in cells:
						var cell_pos := rect.position + Vector2(24 + cell.x * 19, 44 + cell.y * 19)
						_rr(Rect2(cell_pos, Vector2(16, 16)), PLAYER_COLORS[color_index], 4)
			_center("Rows/columns = BONUS POINTS", 700, 435, 500, 13, Color("#16895B"))
		"orb_dash":
			_rr(Rect2(90, 154, 1100, 300), Color("#202B47"), 24)
			for i in range(36):
				var star_x := 110.0 + float((i * 97) % 1055)
				var star_y := 173.0 + float((i * 53) % 258)
				draw_circle(Vector2(star_x, star_y), 1.6 if i % 3 == 0 else 1.0, Color("#FFFFFF44"))
			_center("COLLECT THE GOLD GEM · 10 POINTS EACH", 330, 145, 620, 13, PURPLE)
			draw_circle(orb_target, 22, Color("#FFE16B44"))
			draw_circle(orb_target, 13, YELLOW)
			draw_circle(orb_target + Vector2(-3, -4), 4, WHITE)
			for p in range(player_count):
				var pos: Vector2 = player_data[p]["orb_pos"]
				draw_circle(pos + Vector2(0, 5), 18, Color("#11182766"))
				draw_circle(pos, 17, WHITE)
				draw_circle(pos, 13, PLAYER_COLORS[p])
				draw_circle(pos + Vector2(-4, -5), 4, Color("#FFFFFFCC"))
				_center(str(p + 1), pos.x - 9, pos.y + 5, 18, 11, INK)

func _draw_race_car(player: int, position: Vector2, car_color: Color) -> void:
	# Chunky top-down car, with a windshield, number plate, headlights and animated wheel placement.
	_rr(Rect2(position.x + 8, position.y + 26, 64, 9), Color("#101827"), 4)
	_rr(Rect2(position.x + 4, position.y + 7, 74, 26), car_color, 9)
	_rr(Rect2(position.x + 21, position.y + 2, 39, 17), car_color.lightened(0.14), 7)
	_rr(Rect2(position.x + 27, position.y + 5, 25, 11), Color("#DDF7FF"), 4)
	_rr(Rect2(position.x + 10, position.y + 11, 6, 5), WHITE, 2)
	_rr(Rect2(position.x + 66, position.y + 11, 6, 5), WHITE, 2)
	_rr(Rect2(position.x + 12, position.y + 29, 17, 7), Color("#101827"), 3)
	_rr(Rect2(position.x + 54, position.y + 29, 17, 7), Color("#101827"), 3)
	_center(str(player + 1), position.x + 28, position.y + 25, 24, 11, INK)

func _draw_player_panel(p: int) -> void:
	var rect := _player_panel_rect(p)
	var col: Color = PLAYER_COLORS[p]
	_rr(rect, col.lightened(0.70), 18)
	_rr(Rect2(rect.position.x + 6, rect.position.y + 6, rect.size.x - 12, 39), col, 12)
	_txt("PLAYER %d" % (p + 1), rect.position.x + 15, rect.position.y + 31, 14, WHITE)
	_txt(str(player_status[p]), rect.position.x + 15, rect.position.y + 62, 11, INK)
	if current_game == "block_battle":
		var data: Dictionary = player_data[p]
		_txt("%d POINTS · %d LINES" % [int(data["block_score"]), int(data["block_lines"])], rect.position.x + 15, rect.position.y + 86, 10, MUTED)
		_rr(Rect2(rect.position.x + 10, rect.position.y + 99, rect.size.x - 20, 31), Color("#FFFFFF99"), 10)
		_center("YOUR PUZZLE" if p == active_block_player else "UP NEXT", rect.position.x + 10, rect.position.y + 119, rect.size.x - 20, 10, PURPLE if p == active_block_player else MUTED)
	elif current_game == "orb_dash":
		_draw_joystick(p)
	elif current_game in ["memory_grid", "target_rush"]:
		for c in range(4):
			var button := _color_action_rect(p, c)
			_rr(button, BUTTON_COLORS[c], 10)
			_center(BUTTON_LABELS[c], button.position.x, button.position.y + 35, button.size.x, 14, INK if c == 2 else WHITE)
	else:
		var button := _player_action_rect(p)
		var button_color := YELLOW if current_game != "reflex_rush" else (Color("#45C994") if phase == "reflex_go" else Color("#FFCCD5"))
		if current_game == "mini_racers" and bool(player_data[p]["throttle"]):
			button_color = Color("#45C994")
		_rr(button, button_color, 13)
		var label := "TAP!" if current_game == "tap_sprint" else ("HOLD TO DRIVE" if current_game == "mini_racers" else ("DODGE!" if current_game == "dodge_arena" else "REACT!"))
		_center(label, button.position.x, button.position.y + 36, button.size.x, 18, INK)
	if tournament_active:
		_txt("TOUR: %d PTS" % tournament_scores[p], rect.position.x + 15, rect.position.y + rect.size.y - 8, 10, MUTED)

func _draw_joystick(player: int) -> void:
	var center := _joystick_center(player)
	var stick: Vector2 = player_data[player]["joystick"]
	_draw_joystick_art(center, stick)

func _draw_joystick_art(center: Vector2, stick: Vector2) -> void:
	draw_circle(center, 38, Color("#D9E0F1"))
	draw_circle(center, 31, Color("#F8FAFF"))
	draw_arc(center, 22, 0.0, TAU, 36, Color("#98A5C2"), 1.5, true)
	draw_circle(center + stick * 19.0, 15, PURPLE)
	draw_circle(center + stick * 19.0 + Vector2(-3, -4), 4, Color("#FFFFFFAA"))
	_center("MOVE", center.x - 23, center.y + 53, 46, 8, MUTED)

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
	_center("FINAL SCORES" if tournament_active else "GAME MENU", 650, 594, 250, 17, INK)

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
	_center("GAME MENU", 650, 609, 250, 17, INK)

# -----------------------------------------------------------------------------
# Navigation / hit testing
# -----------------------------------------------------------------------------
func _home_player_rect(i: int) -> Rect2:
	return Rect2(795.0 + float(i) * 103.0, 251.0, 82.0, 62.0)

func _home_round_rect(i: int) -> Rect2:
	return Rect2(795.0 + float(i) * 202.0, 376.0, 190.0, 48.0)

func _home_start_rect() -> Rect2:
	return Rect2(795.0, 451.0, 417.0, 78.0)

func _block_cell_rect(row: int, col: int) -> Rect2:
	return Rect2(362.0 + float(col) * 38.0, 160.0 + float(row) * 38.0, 35.0, 35.0)

func _block_cell_at(pos: Vector2) -> Vector2i:
	for row in range(8):
		for col in range(8):
			if _block_cell_rect(row, col).has_point(pos):
				return Vector2i(col, row)
	return Vector2i(-1, -1)

func _block_piece_at(pos: Vector2) -> int:
	for i in range(3):
		if _block_piece_rect(i).has_point(pos):
			return i
	return -1

func _block_piece_rect(index: int) -> Rect2:
	return Rect2(705.0 + float(index) * 166.0, 255.0, 150.0, 132.0)

func _make_block_pieces() -> Array:
	var pieces: Array = []
	for i in range(3):
		var shape_index := randi_range(0, BLOCK_SHAPES.size() - 1)
		pieces.append({"cells": BLOCK_SHAPES[shape_index].duplicate(), "color_index": randi_range(0, 3), "used": false})
	return pieces

func _block_piece_fits(board: Array, piece: Dictionary, col: int, row: int) -> bool:
	for offset_value in piece["cells"]:
		var offset: Vector2i = offset_value
		var board_x: int = col + offset.x
		var board_y: int = row + offset.y
		if board_x < 0 or board_x >= 8 or board_y < 0 or board_y >= 8 or int(board[board_y * 8 + board_x]) >= 0:
			return false
	return true

func _block_player_has_move(player: Dictionary) -> bool:
	var board: Array = player["block_board"]
	var pieces: Array = player["block_pieces"]
	for piece_value in pieces:
		var piece: Dictionary = piece_value
		if bool(piece["used"]):
			continue
		for row in range(8):
			for col in range(8):
				if _block_piece_fits(board, piece, col, row):
					return true
	return false

func _advance_block_player() -> void:
	# Skip players whose boards have no legal placement, avoiding dead turns.
	var attempts := 0
	while attempts < player_count:
		active_block_player += 1
		if active_block_player >= player_count:
			_finish_round()
			return
		var player: Dictionary = player_data[active_block_player]
		if not _block_player_has_move(player):
			player_status[active_block_player] = "NO MOVES LEFT"
			attempts += 1
			continue
		var pieces: Array = player["block_pieces"]
		selected_block_piece = 0
		for i in range(pieces.size()):
			if not bool(pieces[i]["used"]):
				selected_block_piece = i
				break
		game_time_left = 35.0
		player_status[active_block_player] = "YOUR TURN — MAKE IT COUNT!"
		queue_redraw()
		return
	_finish_round()

func _place_block_piece(row: int, col: int) -> void:
	if current_game != "block_battle" or active_block_player < 0 or active_block_player >= player_data.size():
		return
	var player: Dictionary = player_data[active_block_player]
	var pieces: Array = player["block_pieces"]
	if selected_block_piece < 0 or selected_block_piece >= pieces.size():
		return
	var piece: Dictionary = pieces[selected_block_piece]
	if bool(piece["used"]) or not _block_piece_fits(player["block_board"], piece, col, row):
		return
	var board: Array = player["block_board"]
	var offsets: Array = piece["cells"]
	for offset_value in offsets:
		var offset: Vector2i = offset_value
		board[(row + offset.y) * 8 + col + offset.x] = int(piece["color_index"])
	player["block_board"] = board
	player["block_score"] = int(player["block_score"]) + offsets.size()
	piece["used"] = true
	pieces[selected_block_piece] = piece
	var full_rows: Array[int] = []
	var full_cols: Array[int] = []
	for row_index in range(8):
		var row_full := true
		for col_index in range(8):
			if int(board[row_index * 8 + col_index]) < 0:
				row_full = false
				break
		if row_full:
			full_rows.append(row_index)
	for col_index in range(8):
		var col_full := true
		for row_index in range(8):
			if int(board[row_index * 8 + col_index]) < 0:
				col_full = false
				break
		if col_full:
			full_cols.append(col_index)
	if not full_rows.is_empty() or not full_cols.is_empty():
		var cleared: Dictionary = {}
		for y in full_rows:
			for x in range(8):
				cleared[y * 8 + x] = true
		for x in full_cols:
			for y in range(8):
				cleared[y * 8 + x] = true
		for index in cleared.keys():
			board[int(index)] = -1
		var lines := full_rows.size() + full_cols.size()
		player["block_lines"] = int(player["block_lines"]) + lines
		player["block_score"] = int(player["block_score"]) + lines * 10 + maxi(0, lines - 1) * 5
		player_status[active_block_player] = "COMBO! +%d" % (lines * 10 + maxi(0, lines - 1) * 5)
	else:
		player_status[active_block_player] = "+%d BLOCKS" % offsets.size()
	player["block_board"] = board
	player["block_pieces"] = pieces
	player_data[active_block_player] = player
	var all_pieces_used := true
	for piece_state in pieces:
		if not bool(piece_state["used"]):
			all_pieces_used = false
			break
	if all_pieces_used:
		player["block_pieces"] = _make_block_pieces()
		player_data[active_block_player] = player
		selected_block_piece = 0
	else:
		for i in range(pieces.size()):
			if not bool(pieces[i]["used"]):
				selected_block_piece = i
				break
	if not _block_player_has_move(player_data[active_block_player]):
		player_status[active_block_player] = "NO MOVES LEFT"
		_advance_block_player()
	queue_redraw()

func _spawn_orb_target() -> Vector2:
	var candidate := Vector2(640.0, 300.0)
	for attempt in range(20):
		candidate = Vector2(randf_range(125.0, 1150.0), randf_range(180.0, 425.0))
		var safe := true
		for player in player_data:
			if candidate.distance_to(player["orb_pos"]) < 85.0:
				safe = false
				break
		if safe:
			return candidate
	return candidate

func _select_game_rect(i: int) -> Rect2:
	return Rect2(38.0 + float(i % 4) * 303.0, 137.0 + float(int(i / 4)) * 236.0, 280.0, 218.0)

func _select_tournament_rect() -> Rect2:
	return Rect2(975.0, 45.0, 267.0, 55.0)

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
		"select": _select_tap(pos)
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
		screen_name = "select"
		queue_redraw()
		return

func _select_tap(pos: Vector2) -> void:
	if Rect2(52, 45, 164, 55).has_point(pos):
		_go_home()
		return
	if _select_tournament_rect().has_point(pos):
		_begin_tournament()
		return
	for i in range(GAMES.size()):
		if _select_game_rect(i).has_point(pos):
			_start_quick_game(str(GAMES[i]["id"]))
			return

func _race_player_at(pos: Vector2) -> int:
	if screen_name != "game" or current_game != "mini_racers":
		return -1
	for p in range(player_count):
		if _player_action_rect(p).has_point(pos):
			return p
	return -1

func _joystick_center(player: int) -> Vector2:
	var panel := _player_panel_rect(player)
	return Vector2(panel.position.x + panel.size.x - 53.0, panel.position.y + 98.0)

func _joystick_base_rect(player: int) -> Rect2:
	return Rect2(_joystick_center(player) - Vector2(39.0, 39.0), Vector2(78.0, 78.0))

func _orb_player_at(pos: Vector2) -> int:
	if screen_name != "game" or current_game != "orb_dash":
		return -1
	for p in range(player_count):
		if _joystick_base_rect(p).has_point(pos):
			return p
	return -1

func _update_orb_joystick(player: int, pos: Vector2) -> void:
	if player < 0 or player >= player_data.size():
		return
	var stick: Vector2 = (pos - _joystick_center(player)) / 30.0
	if stick.length() > 1.0:
		stick = stick.normalized()
	player_data[player]["joystick"] = stick
	player_status[player] = "MOVING" if stick.length() > 0.08 else "READY"

func _sync_orb_joystick(player: int) -> void:
	if player < 0 or player >= player_data.size():
		return
	var still_held := orb_mouse_player == player
	for owner in orb_touch_players.values():
		if int(owner) == player:
			still_held = true
	player_data[player]["joystick"] = Vector2.ZERO if not still_held else player_data[player]["joystick"]

func _sync_race_throttle(player: int) -> void:
	if player < 0 or player >= player_data.size():
		return
	player_data[player]["throttle"] = race_mouse_player == player or race_touch_players.values().has(player)

func _game_tap(pos: Vector2) -> void:
	if Rect2(24, 24, 122, 48).has_point(pos):
		_go_to_select()
		return
	if current_game == "block_battle":
		var pieces: Array = player_data[active_block_player]["block_pieces"]
		for i in range(pieces.size()):
			if _block_piece_rect(i).has_point(pos):
				if not bool(pieces[i]["used"]):
					selected_block_piece = i
				queue_redraw()
				return
		for row in range(8):
			for col in range(8):
				if _block_cell_rect(row, col).has_point(pos):
					_place_block_piece(row, col)
					return
		return
	if current_game == "orb_dash":
		var orb_player := _orb_player_at(pos)
		if orb_player >= 0:
			_update_orb_joystick(orb_player, pos)
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
			_go_to_select()

func _final_tap(pos: Vector2) -> void:
	if Rect2(362, 570, 250, 64).has_point(pos):
		_begin_tournament()
	elif Rect2(650, 570, 250, 64).has_point(pos):
		_go_to_select()

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
	race_mouse_player = -1
	race_touch_players.clear()
	orb_mouse_player = -1
	orb_touch_players.clear()
	screen_name = "game"
	game_elapsed = 0.0
	game_time_left = 10.0
	phase_timer = 0.0
	phase = "playing"
	reflex_start_ms = 0
	target_index = randi_range(0, 3)
	memory_sequence.clear()
	for j in range(6 if player_count >= 3 else 5):
		memory_sequence.append(randi_range(0, 3))
	active_memory_player = 0
	memory_show_index = -1
	active_block_player = 0
	selected_block_piece = 0
	dodge_wave = 0
	player_data.clear()
	player_status.clear()
	var orb_starts: Array = [Vector2(230, 220), Vector2(1050, 220), Vector2(230, 410), Vector2(1050, 410)]
	for p in range(player_count):
		var board: Array = []
		for i in range(64):
			board.append(-1)
		var data: Dictionary = {"taps":0,"combo_bonus":0,"reaction_ms":-1,"responded":false,"progress":0.0,"speed":0.0,"throttle":false,"hits":0,"misses":0,"acted":false,"raw":0.0,"input_index":0,"done":false,"block_board":board,"block_pieces":_make_block_pieces(),"block_score":0,"block_lines":0,"orb_pos":orb_starts[p],"joystick":Vector2.ZERO}
		player_data.append(data)
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
			memory_show_index = -1
			phase_timer = 0.45
		"dodge_arena":
			phase = "dodge_ready"
			phase_timer = randf_range(0.8, 1.5)
		"block_battle":
			game_time_left = 35.0
			player_status[0] = "YOUR TURN — MAKE IT COUNT!"
		"orb_dash":
			game_time_left = 30.0
			orb_target = _spawn_orb_target()
	_save_local_save()

func _go_home() -> void:
	screen_name = "home"
	phase = "idle"
	race_mouse_player = -1
	race_touch_players.clear()
	orb_mouse_player = -1
	orb_touch_players.clear()
	block_mouse_drag_piece = -1
	block_touch_pieces.clear()
	_save_local_save()
	queue_redraw()

func _go_to_select() -> void:
	screen_name = "select"
	phase = "idle"
	race_mouse_player = -1
	race_touch_players.clear()
	orb_mouse_player = -1
	orb_touch_players.clear()
	block_mouse_drag_piece = -1
	block_touch_pieces.clear()
	queue_redraw()

func _tick_game(delta: float) -> void:
	game_elapsed += delta
	match current_game:
		"tap_sprint":
			game_time_left = maxf(0.0, game_time_left - delta)
			if game_time_left <= 0.0:
				_finish_round()
		"block_battle":
			game_time_left = maxf(0.0, game_time_left - delta)
			if game_time_left <= 0.0:
				_advance_block_player()
		"orb_dash":
			game_time_left = maxf(0.0, game_time_left - delta)
			for p in range(player_count):
				var position: Vector2 = player_data[p]["orb_pos"]
				var stick: Vector2 = player_data[p]["joystick"]
				position += stick * 230.0 * delta
				position.x = clampf(position.x, 115.0, 1165.0)
				position.y = clampf(position.y, 178.0, 430.0)
				player_data[p]["orb_pos"] = position
				if position.distance_to(orb_target) < 25.0:
					player_data[p]["hits"] = int(player_data[p]["hits"]) + 1
					player_status[p] = "GEM +10 · %d PTS" % (int(player_data[p]["hits"]) * 10)
					orb_target = _spawn_orb_target()
				elif stick.length() > 0.08:
					player_status[p] = "MOVING · %d PTS" % (int(player_data[p]["hits"]) * 10)
			if game_time_left <= 0.0:
				_finish_round()
		"mini_racers":
			game_time_left = maxf(0.0, game_time_left - delta)
			var crossed_finish := false
			for p in range(player_count):
				var speed := float(player_data[p]["speed"])
				if bool(player_data[p]["throttle"]):
					speed = minf(88.0, speed + 112.0 * delta)
				else:
					speed = maxf(0.0, speed - 145.0 * delta)
				player_data[p]["speed"] = speed
				player_data[p]["progress"] = minf(862.0, float(player_data[p]["progress"]) + speed * delta)
				if float(player_data[p]["progress"]) >= 862.0:
					player_status[p] = "FINISH!"
					crossed_finish = true
				elif bool(player_data[p]["throttle"]):
					player_status[p] = "DRIVING · %d SPEED" % roundi(speed)
				elif speed > 2.0:
					player_status[p] = "COASTING · %d SPEED" % roundi(speed)
			if crossed_finish or game_time_left <= 0.0:
				_finish_round()
		"target_rush":
			game_time_left = maxf(0.0, game_time_left - delta)
			phase_timer -= delta
			if phase_timer <= 0.0:
				target_index = randi_range(0, 3)
				phase_timer = maxf(0.35, 0.72 - (12.0 - game_time_left) * 0.025)
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
					if memory_show_index < memory_sequence.size() - 1:
						memory_show_index += 1
						phase_timer = 0.42
				else:
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
						phase = "memory_show"
						memory_show_index = -1
						phase_timer = 0.42
						player_status[active_memory_player] = "WATCH THE PATTERN"
		"dodge_arena":
			phase_timer -= delta
			if phase == "dodge_ready" and phase_timer <= 0.0:
				phase = "dodge_live"
				phase_timer = maxf(0.34, 0.68 - float(dodge_wave) * 0.04)
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
			if int(player_data[p]["taps"]) % 5 == 0:
				player_data[p]["combo_bonus"] = int(player_data[p]["combo_bonus"]) + 1
				player_status[p] = "COMBO! +%d BONUS" % int(player_data[p]["combo_bonus"])
			else:
				player_status[p] = "%d TAPS · %d TO COMBO" % [int(player_data[p]["taps"]), 5 - (int(player_data[p]["taps"]) % 5)]
		"mini_racers":
			if float(player_data[p]["progress"]) < 862.0:
				player_data[p]["speed"] = minf(88.0, float(player_data[p]["speed"]) + 18.0)
				player_status[p] = "NITRO BOOST! %d" % roundi(float(player_data[p]["speed"]))
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
			"tap_sprint": value = float(int(data["taps"]) + int(data["combo_bonus"]))
			"reflex_rush": value = 10000.0 - float(data["reaction_ms"]) if int(data["reaction_ms"]) >= 0 else -1000.0
			"memory_grid": value = float(data["raw"])
			"mini_racers": value = float(data["progress"])
			"dodge_arena": value = float(int(data["hits"]) * 2 - int(data["misses"]))
			"target_rush": value = float(int(data["hits"]) * 2 - int(data["misses"]))
		"block_battle": value = float(data["block_score"])
		"orb_dash": value = float(int(data["hits"]) * 10)
		scores.append(value)
	return scores

func _award_points(scores: Array) -> void:
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
	race_mouse_player = -1
	race_touch_players.clear()
	orb_mouse_player = -1
	orb_touch_players.clear()
	for p in range(player_data.size()):
		player_data[p]["throttle"] = false
		player_data[p]["joystick"] = Vector2.ZERO
	screen_name = "result"
	result_scores = _raw_scores()
	_award_points(result_scores)
	queue_redraw()

func _show_final() -> void:
	screen_name = "final"
	var order := _sorted_players(tournament_scores.map(func(v): return float(v)))
	last_winner = "PLAYER %d WINS!" % (order[0] + 1) if not order.is_empty() else "CHAMPION!"
	queue_redraw()

func _sorted_players(scores: Array) -> Array[int]:
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
		"tap_sprint": return "%d taps · %d combo bonus" % [int(data.get("taps", 0)), int(data.get("combo_bonus", 0))]
		"reflex_rush": return ("%d ms" % int(data.get("reaction_ms", -1))) if int(data.get("reaction_ms", -1)) >= 0 else "False start / too slow"
		"memory_grid": return "%d / %d remembered" % [int(data.get("raw", 0)), memory_sequence.size()]
		"mini_racers": return "%d m raced" % int(data.get("progress", 0))
		"dodge_arena": return "%d successful dodges" % int(data.get("hits", 0))
		"target_rush": return "%d hits · %d misses" % [int(data.get("hits", 0)), int(data.get("misses", 0))]
		"block_battle": return "%d points · %d lines cleared" % [int(data.get("block_score", 0)), int(data.get("block_lines", 0))]
		"orb_dash": return "%d gem points" % (int(data.get("hits", 0)) * 10)
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
