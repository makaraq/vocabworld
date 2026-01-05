// Parse verbs from verbs.txt in exact order and regenerate translations
const fs = require('fs');

// Read and parse verbs.txt
const verbsTxt = `1.  Basic

-   walk
-   run
-   jump
-   hop
-   skip
-   crawl
-   climb
-   slide
-   swing
-   stretch
-   bend
-   lift
-   carry
-   drag
-   push
-   pull
-   hold
-   grab
-   drop
-   throw
-   catch
-   kick
-   hit
-   press
-   twist
-   turn
-   rotate
-   flip
-   shake
-   wave
-   reach
-   lean
-   rest
-   balance
-   spin
-   arrange
-   adjust
-   shift
-   tie
-   untie
-   wrap
-   unwrap
-   fold
-   unfold
-   pack
-   unpack
-   be
-   become
-   seem
-   appear
-   remain
-   stay
-   exist
-   happen
-   occur
-   change
-   improve
-   decline
-   continue
-   stop
-   begin
-   end
-   last


2.  Daily Routine

-   wake
-   get up
-   wash
-   shower
-   bathe
-   brush
-   comb
-   dress
-   change
-   eat
-   drink
-   snack
-   cook
-   bake
-   reheat
-   clean
-   tidy
-   organize
-   vacuum
-   sweep
-   mop
-   dust
-   wash dishes
-   rinse
-   wipe
-   scrub
-   dry
-   shop
-   refill
-   charge
-   relax
-   nap
-   sleep
-   prepare
-   schedule
-   cancel
-   check
-   monitor
-   plan
-   wait
-   search
-   find
-   lose
-   replace

3.  Mental

-   think
-   know
-   believe
-   consider
-   imagine
-   wonder
-   remember
-   forget
-   realize
-   guess
-   predict
-   expect
-   recognize
-   notice
-   focus
-   concentrate
-   decide
-   choose
-   compare
-   analyze
-   evaluate
-   estimate
-   solve
-   question
-   suspect
-   doubt
-   learn
-   study
-   memorize
-   calculate
-   reflect
-   understand
-   like
-   love
-   hate
-   enjoy
-   prefer
-   want
-   need
-   miss
-   care
-   worry
-   fear
-   panic
-   stress
-   relax
-   calm
-   appreciate
-   value
-   respect
-   dislike
-   regret
-   hope
-   trust
-   doubt
-   surprise
-   shock
-   annoy
-   bother
-   confuse
-   embarrass
-   frustrate
-   satisfy
-   comfort
-   cheer

4.  Communication

-   say
-   tell
-   talk
-   speak
-   discuss
-   chat
-   explain
-   describe
-   announce
-   report
-   reply
-   answer
-   ask
-   interrupt
-   suggest
-   recommend
-   complain
-   argue
-   debate
-   whisper
-   shout
-   yell
-   mention
-   remind
-   warn
-   advise
-   encourage
-   persuade
-   invite
-   respond
-   translate
-   inform
-   comment
-   confirm
-   deny
-   admit

6.  Social

-   meet
-   greet
-   welcome
-   visit
-   invite
-   host
-   join
-   help
-   support
-   assist
-   share
-   care for
-   hug
-   kiss
-   hold hands
-   date
-   marry
-   befriend
-   follow
-   lead
-   guide
-   introduce
-   cooperate
-   protect
-   include
-   exclude

7.  Work

-   work
-   write
-   read
-   edit
-   revise
-   review
-   inspect
-   check
-   complete
-   submit
-   organize
-   schedule
-   cancel
-   prepare
-   create
-   design
-   build
-   assemble
-   debug
-   research
-   document
-   train
-   teach
-   learn
-   report
-   update
-   upload
-   download
-   print
-   scan
-   record
-   calculate
-   track
-   manage
-   supervise
-   analyze
-   improve
-   evaluate
-   plan

8.  Travel

-   go
-   come
-   move
-   leave
-   arrive
-   enter
-   exit
-   travel
-   fly
-   drive
-   ride
-   board
-   land
-   park
-   stop
-   accelerate
-   reverse
-   turn
-   cross
-   wander
-   explore
-   visit
-   return
-   rush
-   hurry
-   follow
-   lead
-   navigate

9.  Household

-   clean
-   wash
-   wipe
-   dust
-   scrub
-   rinse
-   sanitize
-   fold
-   iron
-   store
-   organize
-   arrange
-   repair
-   fix
-   assemble
-   disassemble
-   install
-   uninstall
-   replace
-   remove
-   connect
-   disconnect
-   charge
-   lock
-   unlock
-   decorate
-   polish
-   hammer
-   saw
-   glue

10. Money

-   buy
-   sell
-   pay
-   owe
-   borrow
-   lend
-   rent
-   save
-   spend
-   invest
-   earn
-   refund
-   exchange
-   order
-   return
-   compare
-   select
-   choose
-   calculate
-   withdraw
-   deposit
-   budget

11. Food

-   eat
-   drink
-   cook
-   bake
-   fry
-   grill
-   boil
-   steam
-   slice
-   cut
-   chop
-   mix
-   stir
-   pour
-   serve
-   taste
-   season
-   marinate
-   chew
-   swallow
-   order
-   deliver
-   pack
-   digest

12. Nature

-   rain
-   snow
-   hail
-   sleet
-   freeze
-   melt
-   shine
-   blow
-   grow
-   bloom
-   wither
-   sprout
-   fall
-   quake
-   erode
-   burn
-   flood
-   float
-   sink
-   rise
-   set

13. Health

-   breathe
-   inhale
-   exhale
-   cough
-   sneeze
-   sweat
-   bleed
-   heal
-   recover
-   ache
-   hurt
-   strain
-   stretch
-   exercise
-   train
-   rest
-   faint
-   vomit
-   digest
-   blink
-   squint
-   tremble

14. Technology

-   click
-   tap
-   scroll
-   swipe
-   search
-   browse
-   install
-   uninstall
-   update
-   upgrade
-   download
-   upload
-   save
-   copy
-   paste
-   delete
-   remove
-   reset
-   restart
-   log in
-   log out
-   connect
-   sync
-   scan
-   stream
-   record
-   charge
-   encrypt
-   backup`;

// Parse verbs in exact order (keeping duplicates for now, will track order)
const lines = verbsTxt.split('\n');
const verbsInOrder = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('-')) {
    const verb = trimmed.replace(/^-\s*/, '').trim();
    if (verb) {
      verbsInOrder.push(verb);
    }
  }
}

console.log(`📝 Total verbs in order: ${verbsInOrder.length}`);
console.log('First 10:', verbsInOrder.slice(0, 10));
console.log('Last 10:', verbsInOrder.slice(-10));

// Save to file
fs.writeFileSync('scripts/verbs-ordered.json', JSON.stringify(verbsInOrder, null, 2), 'utf8');
console.log('\n✅ Saved to scripts/verbs-ordered.json');
