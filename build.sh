OUTDIR="build"

set -e

for FILE in *.html *.css *.js *.png *.gif *.gxw
do
    cp $FILE $OUTDIR
done

for DIR in highlightjs pictures
do
    cp -r $DIR $OUTDIR
done
