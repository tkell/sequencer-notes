echo "beginning rsync"
rsync -r /Users/thor/Code/sequencer-notes/app/* tidepool@tide-pool.ca:/home/tidepool/www/seek
echo "rsync complete!"
