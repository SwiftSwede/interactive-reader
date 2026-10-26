// Seed real exam prompts into the database.
//
//   npx tsx scripts/seed-exam-prompts.ts
//
// Inserts one pre-intermediate and one intermediate exam prompt.
// Idempotent: updates the row if a prompt with the same title+level already exists.

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";
import { parseExamForm, defaultExamTaskCopy } from "../src/lib/exam";

type ExamSeed = {
  title: string;
  theme: string;
  level: "pre-intermediate" | "intermediate";
  vocabRaw: string;
  task1Raw: string;
  task2Raw: string;
  task3Raw: string;
  timeLimitMinutes: number;
  /** Optional override; defaults to paragraph_restructuring for intermediate, sentence_correction for pre-int. */
  task2Type?: "paragraph_restructuring" | "sentence_correction";
};

const EXAMS: ExamSeed[] = [
  {
    title: "Agosto — Niñera",
    theme: "Babysitting",
    level: "pre-intermediate",
    timeLimitMinutes: 45,
    vocabRaw: `Ashamed | avergonzado
Beat up | dar una paliza
Brat | mocoso
Come up with | idear
Disturb | molestar
Drawer | cajón
Get carried away | dejarse llevar
Glance | mirada
Look after | cuidar de
Ought to | debería
Pout | hacer pucheros
Quiet | tranquilo
Reassure | tranquilizar
Request (noun) | solicitud
Sneeze | estornudar
Snitch / rat out (verb) | acusar
Starve | morirse de hambre
Stubborn | terco
Swear / cuss | decir una mala palabra
Take the fall | echarse la culpa
Tickle | cosquilla
Update | actualización`,
    task1Raw: `On Friday night, Mrs. Rivera asked me to {cuidar de|look after} her two children, Leo and Sofia.
Before she left, she made one important {solicitud|request}: "Please keep the house {tranquilo|quiet} after eight o'clock."
I promised to send her an {actualización|update} later that evening, so she would not worry.
At first, I sat on the sofa and took a quick {mirada|glance} at my phone while the children played.
Then Leo, a spoiled little {mocoso|brat}, opened a kitchen {cajón|drawer} and found a bag of candy.
He wanted to eat all of it, but I told him he {debería|ought to} save some for his sister.
Leo became very {terco|stubborn}, crossed his arms, and started to {hacer pucheros|pout}.
Sofia saw the candy and said, "If you don't share, I'll {acusarte|snitch|rat you out} to Mom!"
Leo got angry and said he would {dar una paliza|beat up} her stuffed bear, but I told him that threatening people or their things was not acceptable.
He looked {avergonzado|ashamed} when he realized I had heard him.
Just then, Sofia began to {estornudar|sneeze}, and Leo said the noise would {molestar|disturb} the neighbors.
I {tranquilicé|reassured} her he was exaggerating and gave her a tissue and a glass of water.
Soon, both children said they were going to {morirse de hambre|starve}, even though they had eaten dinner only an hour earlier.
I had to {idear|come up with} a simple solution, so we made fruit sandwiches together.
The children became excited and started to {dejarse llevar|get carried away} by the activity, putting far too much peanut butter on the bread.
When Leo accidentally knocked over a cup and {dijo una mala palabra|swore|cussed}, Sofia offered to {echarse la culpa|take the fall} because she thought he would get in trouble.
To change the mood, I gave Leo a gentle {cosquilla|tickle} to show that nobody was in trouble.`,
    task2Raw: `fix | The dog has to looking after the baby. | The dog has to look after the baby.
ok | I think a child can take care of themselves when they're 13.
fix | He just wanted the dog read him a story. | He just wanted the dog to read him a story.
fix | They was picked up by a limousine. | They were picked up by a limousine.
fix | They find the baby sheep seeing TV. | They find the baby sheep watching TV.
fix | The dog asleep. | The dog fell asleep.
ok | I'm pretty sure my family would never trust an American babysitter.
fix | We can see how complicated is to be a babysitter. | We can see how complicated it is to be a babysitter.
ok | In the end, Bitzer was a very tired dog.
fix | I take him a lot of photos. | I take a lot of photos of him.`,
    task3Raw: `Tití me ama mucho. | Auntie loves me a lot.
Tití me preguntó si tengo muchas novias. | Auntie asked me if I have a lot of girlfriends.
Soy la niñera cuando mi hermana y cuñado salen. | I'm the babysitter when my sister and my brother-in-law go out.
Cuidar a mi hijo sola no es fácil. | Taking care of my son by myself isn't easy.
¿Las estaciones del año se escriben con mayúscula en inglés? | Are the seasons written with a capital letter in English? | Are the seasons spelled with a capital letter in English?
Hay demasiada violencia en mi país. | There is too much violence in my country.
Siempre me ayudaron con mis tareas colegiales. | They always helped me with my homework.
Mis amigos actuales no tienen hijos tampoco. | My current friends don't have children either.
Ella contrataría a la niñera mexicana si entendiera lo que decía. | She would hire the Mexican babysitter if she understood what she said.
Yo habría sido un mejor adolescente si mi madre me hubiera abrazado más. | I would have been a better teenager if my mom had hugged me more.`,
  },
  {
    title: "Agosto — Jefes",
    theme: "Bosses",
    level: "intermediate",
    timeLimitMinutes: 45,
    vocabRaw: `Approach | enfoque
Barred | prohibidas
Bond | vínculo
Brainy | inteligente
Catch on | darse cuenta
Cherished | apreciado
Embezzle | malversar
Fallout | consecuencias
Harsh | severa
Instill | inculcar
Live up to | estar a la altura de
Outcome | resultado
Outstanding | sobresaliente
Pull for | apoyar
Rant | perorata
Reprimand | reprenda
Sacked | despedido
Shortcoming | defecto
Slacker | flojo
Stickler | persona estricta
Sweep under the rug | ocultar
Under the radar | desapercibido
Whistleblower | denunciante
Witness | presenciar`,
    task1Raw: `When I started at Northgate Media, I loved Daniel's relaxed {enfoque|approach} to managing people.
He trusted us to do our jobs, and he was deeply {apreciado|cherished} by the whole team.
The strong {vínculo|bond} between Daniel and his employees made the office feel more like a community than a workplace.
He would always {apoyar|pull for} new employees when they attempted to do something difficult.
However, Daniel's biggest {defecto|shortcoming} was that he gave too many chances to Mark, the office {flojo|slacker}.
Mark regularly arrived late, missed deadlines, and assumed that nobody would notice and since Daniel rarely checked the expense reports, Mark tried to {malversar|embezzle} company money by submitting fake travel receipts.
He hoped the missing money would go {desapercibido|under the radar}, but I {presencié|witnessed} him putting suspicious invoices into his desk drawer one evening.
Ana, our {inteligente|brainy} finance analyst, soon began to {darse cuenta|catch on} that the numbers did not add up.
She became a {denunciante|whistleblower} and reported what she had found to the directors.
Her decision caused serious {consecuencias|fallout}: Mark was fired immediately, and Daniel was also {despedido|sacked} because he had tried to {ocultar|sweep under the rug} Mark's behavior instead of reporting it.
Our new boss, Ms. Chase, was completely different.
She was a {persona estricta|stickler} about every policy, and casual conversations during work hours were {prohibidas|barred}.
On my first week under her, she gave me a {reprenda|reprimand} for arriving three minutes late; it felt unnecessarily {severa|harsh}.
At a team meeting, she went on a long {perorata|rant} about responsibility and professionalism.
At first, we hated her rules, but she was trying to {inculcar|instill} better habits in the team.
She said everyone had to {estar a la altura de|live up to} the company's ethical standards, not just meet their deadlines.
Three months later, the {resultado|outcome} of her changes was {sobresaliente|outstanding}: our reports were more accurate, and nobody was afraid to report a problem.`,
    task2Raw: `3 | Firstly, I'm incredibly lazy.
6 | One time I gave an annoying customer the middle finger because I knew my boss wouldn't do anything about it.
1 | If you've be fully employed for a meaningful length of time, you've probably had your share of both strict and laid-back bosses.
5 | Secondly, I cause trouble if there is no authority figure.
4 | If someone isn't breathing down my neck from the moment I walk in the door, I just stare at the ceiling.
7 | It's because of my unique personality that I can only be a functional coworker and employee with a draconian boss.
2 | Personally, I react best to a strict boss.`,
    task3Raw: `Me enorgullezco de mi trabajo. | I am proud of my work. | I take pride in my work.
Es posible que nos demande. | It's likely they'll sue us.
Les recuerdo que les he hecho favores en el pasado cuando les pido que trabajen horas extras. | I remind them that I've done favors for them in the past when I ask them to work overtime.
Estaba adolorida durante tres días después de mi entrenamiento. | I was sore for 3 days after my workout.
Mi jefe hace cumplir un estricto código de vestimenta. | My boss enforces a strict dress code.
No me regañes por algo tan insignificante. | Don't reprimand me for something so insignificant. | Don't give me shit for something so insignificant. | Don't dress me down for something so insignificant. | Don't scold me for something so insignificant.
¿Al menos te dieron una buena liquidación? | Did they give you a good severance package at least? | Were you given a good severance package at least?
Acordamos una fecha para la reunión. | We agreed on a date for the meeting. | We agreed upon a date for the meeting.
Si mi jefe fuera menos mandón, no estaría tan estresado. | If my boss were less bossy, I wouldn't be so stressed out.
Si hubiera escuchado a su madre, no se habría desviado del buen camino. | If he had listened to his mother, he wouldn't have gone down the wrong path.`,
  },
  {
    title: "Septiembre — Tráfico",
    theme: "Driving",
    level: "pre-intermediate",
    timeLimitMinutes: 45,
    vocabRaw: `Accelerate | acelerar
Back out / reverse | retroceder
Brake | frenar
Bystander | transeúnte
Cut in front | meterse delante
Deadline | fecha límite
Delay | demora
Dent | abolladura
Detour | desvío
Double-check | verificar
Freeway | autopista
Go off | sonar
Honk | tocar la bocina
Park | estacionar
Pull over | orillarse
Rear-end | chocar por detrás
Rush hour | hora pico
Stall | apagarse
Steer | dirigir
Steering wheel | volante
Ticket | multa
Turnoff | salida`,
    task1Raw: `I had until 5:00 p.m., the {fecha límite|deadline}, to pay an old parking fine at City Hall.
I left during {la hora pico|rush hour} and entered the {autopista|freeway} with only forty minutes remaining.
Before driving farther, I stopped at a gas station to {verificar|double-check} that I had my wallet, the notice, and the office address.
My calendar alarm began to {sonar|go off}, and the navigation app announced a long {demora|delay} ahead.
It sent me on a {desvío|detour}, but I missed the correct {salida|turnoff} and ended up ten minutes farther away.
At the next traffic light, my old car began to {apagarse|stall}, and I restarted it just before the light changed.
I tried to {acelerar|accelerate} calmly, but another driver suddenly tried to {meterse delante de mí|cut in front of me|cut in front}.
I had to {frenar|brake} hard, and a distracted driver behind me {chocó por detrás|rear-ended} my car.
A {transeúnte|bystander} who had seen everything called for help, while impatient drivers began to {tocar la bocina|honk}.
The impact left only a small {abolladura|dent}, but I was shaking as I moved out of traffic.
I decided to {orillarme|pull over} near a small coffee shop and exchange insurance information with the other driver.
A police officer arrived and wrote the other driver a {multa|ticket} for following too closely.
When I returned to my car, I gripped the {volante|steering wheel} and carefully {dirigí|steered} around the roadwork.
Near City Hall, I found an open space, but I had to {retroceder|back out|reverse} when I noticed a delivery truck was blocking it.
I finally managed to {estacionar|park} two blocks away and ran inside with four minutes left.`,
    task2Raw: `fix | I need a car to move in the city. | I need a car to get around the city.
fix | I can drive since 4 years ago. | I've been driving for 4 years.
ok | How long have you been driving?
fix | I feel secure when I drive a car. | I feel safe when I drive a car.
fix | The first course I took was at my 18 years old. | The first course I took was when I was 18.
fix | The hardest part of drive is switching gears. | The hardest part of driving is switching gears.
ok | I have no clue how to drive a stick.
fix | She drives since she was 17 years old. | She has been driving since she was 17 years old.
ok | I was in a car accident a few years ago.
fix | He crashed his car with a wall. | He crashed his car into a wall.`,
    task3Raw: `Además de eso, él tiene mal aliento. | Besides that, he has bad breath. | On top of that, he has bad breath. | Apart from that, he has bad breath.
¿Cuál es la mejor manera de moverse por la ciudad? | What's the best way to get around the city?
Suspendí el examen de conducir dos veces antes de finalmente obtener mi licencia. | I failed my driving test twice before finally getting my license.
No sé cómo cambiar las marchas en un carro manual. | I don't know how to change gears in a manual car.
Tras el accidente, tuve que recuperar la confianza al volante. | After the accident, I had to regain my confidence behind the wheel.
Conducir al trabajo todos los días es agotador. | Driving to work every day is exhausting.
¿Estamos seguros aquí? | Are we safe here? | Are we secure here?
Tengo 3 años manejando. | I've been driving for 3 years. | I've been driving for three years.
Si pudiera comprar cualquier carro, sería un 1997 Toyota Corolla. | If I could buy any car, it would be a 1997 Toyota Corolla.
No se habría estrellado contra el poste de luz si supiera conducir un carro con cambio manual. | He wouldn't have crashed into the light pole if he knew how to drive a manual car. | He wouldn't have crashed into the light pole if he knew how to drive a stick.`,
  },
  {
    title: "Septiembre — Supersticiones",
    theme: "Superstition",
    level: "intermediate",
    timeLimitMinutes: 45,
    vocabRaw: `Above all | sobre todo
Brace | prepararse
Bring up | criar
Childish | infantiles
Concern | preocupación
Curtail | recortar
Dusty | polvoriento
Enable | permitir
Furthermore | además
Insight | comprensión
Jinx | gafar
Lowdown | todos los detalles
Outlook | perspectiva
Pant | jadear
Powerless | impotente
Pull off | lograr
Praise | elogios
Remarkable | extraordinario
Rewarding | gratificante
Riveting | cautivadoras
Swanky | elegante
Trigger | provocar`,
    task1Raw: `{Sobre todo|Above all}, my grandmother taught me to respect the stories that frightened me.
She {me crió|brought me up|brought up|raised me} with warnings about birds at the window, yellow butterflies, and names that should never be spoken at night.
When I was sixteen, I called those beliefs {infantiles|childish}, although I still avoided mocking them out loud.
Years later, I attended a reading about Gabriel García Márquez at an {elegante|swanky} hotel in Cartagena.
The event promised to give us {todos los detalles|the lowdown|lowdown} about the superstitions that influenced his fictional world.
While I waited, I opened a {polvoriento|dusty} copy of One Hundred Years of Solitude that I had bought at a street stall.
The organizer's main {preocupación|concern} was a storm that could interrupt the event.
She asked us to {prepararnos para|brace for|brace ourselves for|brace} a brief power outage, but she explained that a generator would {permitir|enable} the reading to continue.
{Además|Furthermore}, the speaker promised a question-and-answer session after the presentation.
Her {comprensión|insight} of García Márquez's childhood made his strange scenes feel connected to real Colombian life.
Her stories were so {cautivadoras|riveting|captivating} that I forgot about the dark clouds gathering outside.
Then a frightened guest rushed in, {jadeando|panting}, because a yellow butterfly had flown through the open lobby window.
I worried that the unusual visitor might {gafar|jinx} the evening, but the speaker smiled and welcomed it.
That response changed my {perspectiva|outlook} on superstition: perhaps it could be a source of imagination instead of fear.
A loud crack of thunder seemed to {provocar|trigger} nervous whispers around the room, and for a moment I felt completely {impotente|powerless}.
The organizers decided to {recortar|curtail} the discussion, yet they still {lograron|pulled off} a beautiful candlelit reading.
Afterward, the guests offered warm {elogios|praise} to the staff, and I realized why García Márquez remains such an {extraordinario|remarkable} writer.
The evening was deeply {gratificante|rewarding}, because it taught me to see my grandmother's old warnings with new respect.`,
    task2Raw: `3 | For one, superstitions make everyday life more colorful.
7 | They may be silly but imagine how monotonous life would be without them.
1 | Nowadays, most people view old superstitions as childish and outdated.
5 | Secondly, superstitions, no matter how silly, can give us hope when we most need it.
4 | You're walking down a street and a friend walks under a ladder, suddenly you have something funny to talk about.
6 | Hockey players will tape their sticks the same way before every game as a way to get their minds thinking positive.
2 | And while they may not be backed by science, I believe superstitions should still be followed.`,
    task3Raw: `Tengo la boca hinchada debido a una infección en una muela del juicio. | I have a swollen mouth due to an infection in a wisdom tooth.
Me inclino hacia la izquierda políticamente. | I lean to the left politically.
A pesar de las críticas, mantuvo una amistad de por vida con el dictador. | Despite the criticism, he maintained a lifelong friendship with the dictator.
No me eches la mala suerte. | Don't jinx me. | Don't bring me bad luck.
Me están entrando dudas sobre casarme con ella. | I'm starting to have doubts about marrying her. | I'm having second thoughts about marrying her.
Necesitas familiarizarte con el terreno antes de comprometerte por completo con algo. | You need to familiarize yourself with the terrain before fully committing to something.
Si tuvieras más suerte, no necesitarías pedirme plata por la quinta vez. | If you had more luck, you wouldn't need to ask me for money for the fifth time.
Si un gato negro no me hubiera cruzado el camino, yo habría ganado el contrato. | If a black cat hadn't crossed my path, I would have won the contract.`,
  },
  {
    title: "Octubre — Halloween",
    theme: "Halloween",
    level: "pre-intermediate",
    timeLimitMinutes: 45,
    vocabRaw: `Coffin | ataúd
Cover | tapar
Creepy/eerie | que da escalofríos
Curfew | toque de queda
Disturbed | molestado
Doorbell | timbre
Dressed up as | disfrazado de
Give up | rendirse
Gory | sangriento
Graveyard | cementerio
Greedy | codicioso
Grumpy | gruñón
Handful | puñado
How come | ¿por qué?
Nightmare | pesadilla
Pillowcase | funda de almohada
Scary | que da miedo
Scared | asustado
Scare | asustar
Sneak in | colarse
Spill the beans | revelar el secreto
Stranger | desconocido
Wrapper | envoltorio`,
    task1Raw: `Last Halloween, I was {disfrazado de|dressed up as} a vampire, and my little brother Leo was a ghost.
We each carried a {funda de almohada|pillowcase} because it holds more candy than a bucket.
Mom gave us a {toque de queda|curfew}: we had to be home by nine o'clock.
Our street looked very {que da escalofríos|creepy|eerie} in the dark.
I rang the {timbre|doorbell} at the first house, and a {gruñón|grumpy} old man opened the door.
{¿Por qué?|How come} kids always come so late? he asked.
He said we had {molestado|disturbed} his dinner.
He surprisingly gave us a {puñado|handful} of candy, but Leo, who is very {codicioso|greedy}, still complained.
Then we walked toward the old {cementerio|graveyard}, where there was a haunted house.
On the porch, there was a fake {ataúd|coffin} with a {sangriento|gory|bloody} zombie inside.
I thought the house was very {que da miedo|scary}.
The zombie jumped out to {asustar|scare} us, and Leo was really {asustado|scared|freaked out}.
He tried to {tapar|cover} his eyes, and he wanted to {rendirse|give up} and go home.
On the way back, a {desconocido|stranger} in a black coat followed us for two blocks.
We ran, but it was ten minutes past nine when we got home, so we had to {colarse|sneak in} through the kitchen window.
Leo promised not to {revelar el secreto|spill the beans}, but Mom found a candy {envoltorio|wrapper} on the floor.
That night, I had a terrible {pesadilla|nightmare} about the man in the black coat.`,
    task2Raw: `ok | I haven't been able to watch scary movies again.
fix | I don't watch movies, scare movies. | I don't watch movies, scary movies.
ok | I really value a good night's sleep.
fix | She born here. | She was born here.
fix | In 20 minutes, I already at university. | In 20 minutes, I'll already be at university.
fix | Thank you for explaining me. | Thank you for explaining it to me.
fix | I enjoy to watch scary movies. | I enjoy watching scary movies.
fix | At this morning, I did exercise. | This morning, I did exercise.
fix | It's middle of the week. | It's the middle of the week.
ok | It's not something I do on a daily basis.`,
    task3Raw: `La última película de miedo que vi fue hace muchos años, y fue El Fotógrafo. | The last scary movie I saw was many years ago, and it was El Fotógrafo. | The last horror movie I watched was many years ago, and it was El Fotógrafo.
Cuando la película es muy sangrienta, me tapo los ojos. | When the movie is very gory, I cover my eyes. | When the movie is really bloody, I cover my eyes.
De niña tuve una pesadilla horrible, y no quería ir al baño sola durante semanas. | As a girl, I had a horrible nightmare, and I didn't want to go to the bathroom alone for weeks. | When I was a girl, I had a terrible nightmare, and I didn't want to go to the bathroom alone for weeks.
Estoy un poco cansada, pero fue un buen fin de semana. | I'm a little tired, but it was a good weekend. | I'm a bit tired, but it was a good weekend.
No he podido ver películas de terror otra vez. | I haven't been able to watch scary movies again. | I haven't been able to watch horror movies again.
¿A qué hora es el toque de queda? | What time is curfew? | What time is the curfew?
Anoche trabajé el turno de noche. | Last night I worked the night shift. | I worked the night shift last night.
La última vez que vi una película de terror fue en un vuelo. | The last time I watched a scary movie was on a flight. | The last time I saw a horror movie was on a flight.
Si un desconocido te diera un dulce que se ve deliciosa, ¿la comerías? | If a stranger gave you a candy that looked delicious, would you eat it?
Si no hubiera tenido esa pesadilla de niña, no habría dejado de ver películas de terror. | If I hadn't had that nightmare as a girl, I wouldn't have stopped watching scary movies. | If I hadn't had that nightmare as a child, I wouldn't have stopped watching horror movies.`,
  },
  {
    title: "Octubre — Oficina Espeluznante",
    theme: "Halloween",
    level: "intermediate",
    timeLimitMinutes: 45,
    task2Type: "sentence_correction",
    vocabRaw: `Buried | enterrado
Churn | la rotación de clientes
Creepy | espeluznante
Disturbing | inquietante
Displeased | disgustado, descontento
Hassle | molestia
Moody | de humor cambiante
Omen | señal, presagio
Poise | compostura, aplomo
Pricey | costoso
Relentless | implacable
To bomb | fracasar estrepitosamente
To cut down (on) | reducir el consumo
To fit the bill | ser el ideal para el puesto
To get into the weeds | entrar en lo más complicado
To get rid of | deshacerse de
To give the cold shoulder | dar el hombro frío
To overlap | superponerse
To plow ahead | seguir adelante con determinación
To trigger | provocar
To upsell | venderle algo más caro
To waver | vacilar, no desviarse
Understaffed | con falta de personal`,
    task1Raw: `On October 28, our customer success team was {con falta de personal|understaffed}, and our monthly {la rotación de clientes|churn} looked like a horror movie.
The first {mal señal|omen} came at 8 a.m., when three major clients asked to cancel their contracts.
One of them was {disgustado|displeased} because our last update had {provocado|triggered} a series of bugs in his system.
His email was so {inquietante|disturbing} that I read it twice before answering.
My boss was {de humor cambiante|moody} that week, and she would {dar el hombro frío|give the cold shoulder} to anyone who brought her bad news.
Nobody wanted to talk about our last product launch, which had {fracasado estrepitosamente|bombed} in September.
The full report was {enterrado|buried} in a shared folder that nobody ever opened.
We called an emergency meeting, but it {superponerse|overlapped} with the office costume contest, so half the team showed up dressed as ghosts.
The conference room was full of candy, so I asked everyone to {reducir el consumo|cut down on} sugar before our tempers got worse.
I did not want to {entrar en lo más complicado|get into the weeds} about every single bug, so I focused on the biggest problem: our pricing.
Clients told us our premium plan was too {costoso|pricey} for what it offered.
Meanwhile, our sales rep kept trying to {venderle algo más caro|upsell something} to angry customers, which only created more {molestia|hassle}.
We decided to {deshacernos de|get rid of} the premium plan and build a simpler one.
We had hired Alejandra as account manager because she {fue el ideal para el puesto|fit the bill}, but the empty desks around her looked {espeluznante|creepy} on her first Halloween with us.
She spoke to angry clients with great {compostura|poise}.
Her {implacable|relentless} follow-up calls won back two of the three clients.
She did not {vacilar|waver} even when the third client hung up on her.
We decided to {seguir adelante con determinación|plow ahead} with the new plan, and by the end of November the team finally felt alive again.`,
    task2Raw: `ok | I didn't sleep very well that night because I had nightmares.
fix | It rained very heavy yesterday in Quito. | It rained very heavily yesterday in Quito.
ok | Yesterday I only spent time with my family and relaxed.
fix | In this moment, I'm reading a book called Ikigai. | At the moment, I'm reading a book called Ikigai.
fix | Tomorrow I have a meet with our partner in Mexico, and after that we have to meet with the customer. | Tomorrow I have a meeting with our partner in Mexico, and after that we have to meet with the customer.
ok | Books were my first experience with horror when I was a child.
fix | Since I become old, I don't enjoy scary movies anymore. | Since I've gotten older, I don't enjoy scary movies anymore.
fix | It took too much hours to paint her face. | It took too many hours to paint her face.
fix | I was a bit tiring because I had to accompany my husband to a medical appointment. | I was a bit tired because I had to accompany my husband to a medical appointment.
fix | He continued thinking that he wants to cancel the project and came back the money. | He continued thinking that he wants to cancel the project and get the money back.`,
    task3Raw: `Mi jefe siempre menciona mis errores en las reuniones. | My boss always brings up my mistakes in the meetings. | My boss always brings up my mistakes in meetings.
El profesor se enojó y adelantó la fecha de entrega una semana. | The professor got mad and pushed the due date up a week.
Tengo demasiados exámenes y proyectos esta semana, y es una molestia. | I have too many exams and projects this week, and it's a hassle.
Tengo mucha evidencia de que hicimos nuestro trabajo, pero el cliente es implacable. | I have a lot of evidence that we did our job, but the customer is relentless. | We have all the evidence we need to prove that we did our job, but the customer is relentless.
El empleado siempre tiene la culpa cuando el cliente está descontento. | The employee is always the one to blame when the customer is displeased.
Mi papá tiene que reducir el consumo de café porque no duerme bien. | My dad has to cut down on coffee because he doesn't sleep well.
No sé qué me provocó el llanto esa noche, pero lloré por una hora. | I don't know what triggered me to cry that night, but I cried for an hour.
Queremos deshacernos de las personas que se mudaron a nuestra casa. | We want to get rid of the people who moved into our house.
Si tuviera que pasar la noche en un hospital abandonado, estaría muy tenso toda la noche. | If I had to spend the night in an abandoned hospital, I would be on edge all night.
Si hubiera escuchado un ruido extraño afuera de mi habitación a las 3 de la mañana, no habría investigado. | If I had heard a strange noise outside my bedroom at 3 in the morning, I wouldn't have investigated.`,
  },
];

async function main() {
  const admin = createAdminClient();

  // Get the teacher profile
  const { data: teacher, error: teacherError } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "teacher")
    .limit(1)
    .maybeSingle();

  if (teacherError || !teacher) {
    console.error("No teacher profile found:", teacherError?.message);
    process.exit(1);
  }

  for (const seed of EXAMS) {
    const task2Type =
      seed.task2Type ??
      (seed.level === "intermediate"
        ? "paragraph_restructuring"
        : "sentence_correction");

    const parsed = parseExamForm({
      title: seed.title,
      theme: seed.theme,
      vocabRaw: seed.vocabRaw,
      task1Raw: seed.task1Raw,
      task2Type,
      task2Raw: seed.task2Raw,
      task3Raw: seed.task3Raw,
      timeLimitMinutes: seed.timeLimitMinutes,
    });

    if (parsed.error) {
      console.error(`✗ ${seed.title}: ${parsed.error}`);
      continue;
    }

    // Check if a prompt with this title+level already exists
    const { data: existing } = await admin
      .from("exam_prompts")
      .select("id")
      .eq("title", seed.title)
      .eq("level", seed.level)
      .maybeSingle();

    const copy = defaultExamTaskCopy(task2Type);
    const payload = {
      title: parsed.title,
      level: seed.level,
      theme: parsed.theme,
      vocabulary_list: parsed.vocabularyList,
      fill_in_translation: parsed.fillInTranslation,
      task2_type: parsed.task2Type,
      paragraph_restructuring: parsed.paragraphRestructuring,
      sentence_correction: parsed.sentenceCorrection,
      translation_sentences: parsed.translationSentences,
      time_limit_minutes: parsed.timeLimitMinutes,
      task1_title: copy.task1Title,
      task1_instructions: copy.task1Instructions,
      task2_title: copy.task2Title,
      task2_instructions: copy.task2Instructions,
      task3_title: copy.task3Title,
      task3_instructions: copy.task3Instructions,
      created_by: teacher.id,
    };

    if (existing) {
      const { error } = await admin
        .from("exam_prompts")
        .update(payload)
        .eq("id", existing.id);
      if (error) {
        console.error(`✗ ${seed.title}: update failed — ${error.message}`);
        continue;
      }
      console.log(
        `✓ Updated "${seed.title}" (${seed.level}) — id: ${existing.id}`
      );
    } else {
      const { data, error } = await admin
        .from("exam_prompts")
        .insert(payload)
        .select("id")
        .maybeSingle();
      if (error || !data) {
        console.error(
          `✗ ${seed.title}: insert failed — ${error?.message ?? "no data"}`
        );
        continue;
      }
      console.log(
        `✓ Inserted "${seed.title}" (${seed.level}) — id: ${data.id}`
      );
    }

    // Summary
    console.log(
      `  vocab: ${parsed.vocabularyList.length} | ` +
        `task1: ${parsed.fillInTranslation.length} sentences, ` +
        `${parsed.fillInTranslation.reduce(
          (n, s) => n + s.slots.length,
          0
        )} slots | ` +
        `task2: ${
          parsed.sentenceCorrection?.length ??
          parsed.paragraphRestructuring?.length ??
          0
        } | ` +
        `task3: ${parsed.translationSentences.length}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
