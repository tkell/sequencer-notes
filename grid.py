import math

class Point():
    def __init__(self, x, y):
        self.x = x
        self.y = y

def get_times(notes, time_per_note):
    times = []
    for i, point in enumerate(notes):
        # For the last note, we loop back to the first note
        if i != len(notes) - 1:
            next_point = notes[i + 1]
        else:
            next_point = notes[0]

        times.append(math.sqrt(abs(point.x - next_point.x) ** 2 + abs(point.y - next_point.y) ** 2))
    return times

time_per_16th = .125 # 120 bpm
notes = [Point(0, 0), Point(0, 1), Point(1, 1)]
print(get_times(notes, 0.125))
