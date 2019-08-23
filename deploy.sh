echo "beginning rsync"
rsync -i /Users/thor/.ssh/dreamhost_rsa -r /Users/thor/Code/sequencer-notes/app/* tidepool@tide-pool.ca:/home/tidepool/www/seek
echo "rsync complete!"
