import re

## So we'll have one textarea - when you enter a valid line, it creates a  "new track", snapped to the nearest 16th note in time, and then clears the textarea
## there are 8 tracks, which are themselves only modifiable in sequence
## notation is (xy-)*xy

def add_track(line):
    print(line, ' is valid')

def is_valid(line):
    return re.match(r'(\d\d-)+\d\d$', line)

lines = [
    '00-01-11-10',
    '00-04-40-',
    '00-01',
    '00-',
    '0-01',
]

for line in lines:
    if is_valid(line):
        add_track(line)
