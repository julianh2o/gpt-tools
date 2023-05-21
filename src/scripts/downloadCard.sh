#!/bin/bash
# input: The name of a Magic The Gathering Card
# output: The file path that the card was downloaded to (in the tmp directory)
##

while read card; do
  curl --get "https://api.scryfall.com/cards/named" --data-urlencode "exact=$card" > /tmp/card.json
  id=$(cat /tmp/card.json | jq .id -r)
  url=$(cat /tmp/card.json | jq .image_uris.normal -r)
  curl "$url" > /tmp/$id.jpg
  echo /tmp/$id.jpg
done