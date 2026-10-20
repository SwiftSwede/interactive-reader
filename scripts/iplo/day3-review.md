# Day 3 — Script vs Audio Review

**187 script lines | 183 anchored | 4 unanchored | 9 discrepancy findings**


Review each finding below, then mark:

- ✅ OK — keep as-is

- ✏️ FIX — correct the script text to match the audio

- 🗑️ SKIP — the recording doesn't have it (donor-splice or leave gap)


After review, the pipeline continues: `fix_answers → lint → import`


---


## Discrepancy Findings (9)


### 🔴 PARTIAL_AUDIO — line 9 (Profe Kyle)

**Script:** Hagamos un ejercicio. En el siguiente ejercicio, usted jugará el papel de hablante masculino únicamente. Asegúrate de repetir la respuesta correcta después del hablante masculino.


**Audio words:** 24/25 tokens matched

**Heard:** hagamos un ejercicio en el siguiente ejercicio usted jugara el papel de hablante masculino unicamente segurate de repetir la respuesta correcta despues del hablante masculino do


**Decision needed:** quiet repeat (fill with donor) or substitution (keep as-is)?



### 🔴 PARTIAL_AUDIO — line 13 (Woman)

**Script:** Yes, you. Do you speak English?


**Audio words:** 3/6 tokens matched

**Heard:** yes i speak english


**Decision needed:** quiet repeat (fill with donor) or substitution (keep as-is)?



### 🔴 PARTIAL_AUDIO — line 20 (Woman)

**Script:** Yes, you. Do you speak English?


**Audio words:** 3/6 tokens matched

**Heard:** yes i speak english


**Decision needed:** quiet repeat (fill with donor) or substitution (keep as-is)?



### 🔴 PARTIAL_AUDIO — line 23 (Woman)

**Script:** Does she speak English?


**Audio words:** 2/4 tokens matched

**Heard:** i speak english


**Decision needed:** quiet repeat (fill with donor) or substitution (keep as-is)?



### 🔴 PARTIAL_AUDIO — line 28 (Man)

**Script:** Who, him?


**Audio words:** 1/2 tokens matched

**Heard:** who


**Decision needed:** quiet repeat (fill with donor) or substitution (keep as-is)?



### 🔴 PARTIAL_AUDIO — line 29 (Woman)

**Script:** Yes, him. Does he speak English?


**Audio words:** 4/6 tokens matched

**Heard:** yes he speaks english


**Decision needed:** quiet repeat (fill with donor) or substitution (keep as-is)?



### 🔴 PARTIAL_AUDIO — line 87 (Profe Kyle)

**Script:** Recuerda que en inglés usamos los pronombres de objeto (me/me, te/you, lo/him, la/her, nos/us, los/them) para las respuestas cortas, a diferencia de español que usa los pronombres de sujeto (yo/I, tú/


**Audio words:** 51/53 tokens matched

**Heard:** que en ingles usamos los pronombres de objeto me you him her us them parlas respuestas cortas a diferencia de espanol que usa los pronombres de sujeto yo tu el ella nosotros ellos en ingles not me no me en espanol yo no i know ahora aprendemos como decir andar escucha y repite walk


**Decision needed:** quiet repeat (fill with donor) or substitution (keep as-is)?



### 🔴 PARTIAL_AUDIO — line 141 (Profe Kyle)

**Script:** Di “ellos no andan a la escuela todos los días.”


**Audio words:** 9/10 tokens matched

**Heard:** ellos no andan a la escuela todos los dias they


**Decision needed:** quiet repeat (fill with donor) or substitution (keep as-is)?



### 🔴 PARTIAL_AUDIO — line 145 (Profe Kyle)

**Script:** Ella acaba de preguntar “¿Y ustedes?” “¿Y ustedes?” lo que significa “and you guys?”. Para esta pregunta corta, solo usamos el pronombre de sujeto. Ahora solo escucha a sus próximas preguntas:


**Audio words:** 27/31 tokens matched

**Heard:** ella acaba de preguntar ustedes lo que significa and you guys para esta pregunta corta solo usamos el pronombre de sujeto you guys ahora solo escucha sus proximas preguntas


**Decision needed:** quiet repeat (fill with donor) or substitution (keep as-is)?



## Unanchored Script Lines (4)

These script lines could not be matched to any audio span:


### ⚪ line 47 (Woman)
Yes, her. Does she speak English?


### ⚪ line 79 (Woman)
Do you guys speak French?


### ⚪ line 152 (Woman)
Do you guys walk to school?


### ⚪ line 186 (Profe Kyle)
Ella acaba de decir, “She goes to school by motorbike.” significa “ella va a la escuela en moto.” “Motorbike” es una forma corta de la palabra “motorcycle” – la que significa motocicleta. Y eso es tod


## Anchored Lines (183) — OK

These script lines matched the audio:

- 0: Profe Kyle [6.8s-14.3s] Bienvenido, bienvenida, a esta tercera lección. Sigamos. Escucha la siguiente conversación.

- 1: Man [15.9s-17.5s] Do you speak English?

- 2: Woman [18.3s-20.0s] Yes, I speak English.

- 3: Man [20.5s-22.6s] Do you speak English at school?

- 4: Woman [23.4s-25.9s] Yes, we all speak English at school.

- 5: Man [26.6s-27.8s] Do you walk to school?

- 6: Woman [27.8s-32.2s] Yes, I walk to school in the morning. Do you walk to school?

- 7: Man [32.7s-39.2s] Yes, I walk to school every day. And your friend? Do you guys walk to school together?

- 8: Woman [40.0s-44.3s] No, she doesn’t walk to school. She goes to school by motorbike.

- 9: Profe Kyle [46.7s-60.5s] Hagamos un ejercicio. En el siguiente ejercicio, usted jugará el papel de hablante masculino únicamente. Asegúrate de re

- 10: Woman [60.9s-62.1s] Do you speak English?

- 11: Profe Kyle [63.0s-64.9s] Pregúntale “¿Quién, yo?”

- 12: Man [65.5s-66.4s] Who, me?

- 13: Woman [72.0s-74.0s] Yes, you. Do you speak English?

- 14: Profe Kyle [68.4s-71.7s] Responde, “sí, hablo inglés.”

- 15: Man [72.0s-74.0s] Yes, I speak English.

- 16: Profe Kyle [82.7s-84.6s] Ella te pregunta otra vez.

- 17: Woman [86.0s-87.1s] Do you speak English?

- 18: Profe Kyle [88.1s-90.1s] Pregúntale “¿Quién, yo?”

- 19: Man [91.0s-92.0s] Who, me?

- 20: Woman [97.6s-99.8s] Yes, you. Do you speak English?

- 21: Profe Kyle [93.9s-97.2s] Responde, “sí, hablo inglés.”

- 22: Man [97.6s-99.8s] Yes, I speak English.

- 23: Woman [99.1s-99.8s] Does she speak English?

- 24: Profe Kyle [103.3s-107.4s] Esta vez no estás seguro a quién se refiere

- 25: Profe Kyle [107.7s-109.2s] Pregúntale, “¿quién?”

- 26: Man [109.9s-110.5s] Who?

- 27: Profe Kyle [112.4s-115.6s] Ahora pregúntale “¿quién, él?”

- 28: Man [116.3s-116.7s] Who, him?

- 29: Woman [123.4s-125.4s] Yes, him. Does he speak English?

- 30: Profe Kyle [119.0s-122.7s] Responde, “sí, él habla inglés.”

- 31: Man [123.4s-125.4s] Yes, he speaks English.

- 32: Profe Kyle [128.8s-134.7s] Ella no escuchó tu respuesta, entonces le preguntas otra vez.

- 33: Woman [134.3s-135.5s] Does he speak English?

- 34: Profe Kyle [136.5s-140.9s] Responde, “sí, él habla inglés.”

- 35: Man [140.3s-142.8s] Yes, he speaks English.

- 36: Profe Kyle [146.0s-147.3s] Ella te hace otra pregunta.

- 37: Woman [148.0s-149.2s] Does she speak English?

- 38: Profe Kyle [150.5s-154.3s] Otra vez, no estás seguro a quién se refiere

- 39: Profe Kyle [155.1s-156.7s] Pregúntale, “¿quién?”

- 40: Man [157.4s-157.7s] Who?

- 41: Profe Kyle [159.5s-162.5s] Ahora pregúntale, “¿quién, ella?”

- 42: Man [163.3s-164.5s] Who, her?

- 43: Profe Kyle [166.7s-170.6s] Ella no te escuchó. Y te pregunta, “¿qué?”

- 44: Woman [171.3s-171.7s] What?

- 45: Profe Kyle [174.0s-177.4s] Pregúntale otra vez “¿quién, ella?”

- 46: Man [178.0s-179.5s] Who, her?

- 48: Profe Kyle [182.9s-186.2s] Responde, “no, ella no habla inglés.”

- 49: Man [187.0s-190.9s] No, she doesn’t speak English.

- 50: Profe Kyle [194.7s-200.4s] Ella no escuchó tu respuesta, entonces ella te pregunta otra vez.

- 51: Woman [202.0s-203.2s] Does she speak English?

- 52: Profe Kyle [204.6s-208.3s] Responde, “no, ella no habla inglés.”

- 53: Man [209.2s-212.5s] No, she doesn’t speak English.

- 54: Profe Kyle [215.8s-218.8s] Di “ella habla portugués.”

- 55: Man [218.4s-221.3s] She speaks Portuguese.

- 56: Profe Kyle [224.5s-226.1s] Ahora ella te hace esta pregunta:

- 57: Woman [226.9s-228.0s] Does she speak English?

- 58: Profe Kyle [228.9s-233.0s] Otra vez, no estás seguro a quién se refiere

- 59: Profe Kyle [233.3s-234.8s] Pregúntale “¿quién?”

- 60: Man [235.5s-235.9s] Who?

- 61: Profe Kyle [237.5s-241.3s] Ahora pregúntale “¿quién, nosotros?”

- 62: Man [242.1s-243.5s] Who, us?

- 63: Profe Kyle [245.1s-248.4s] Ella no te escuchó. Te pregunta “¿qué?”

- 64: Woman [249.3s-249.6s] What?

- 65: Profe Kyle [250.5s-253.1s] Pregúntale otra vez “¿quién, nosotros?”

- 66: Man [253.8s-255.4s] Who, us?

- 67: Woman [256.7s-259.3s] Not us. Do they speak English?

- 68: Profe Kyle [260.0s-263.8s] Responde, “no, ellos no hablan inglés.”

- 69: Man [264.5s-267.4s] No, they don’t speak English.

- 70: Profe Kyle [270.3s-276.1s] Ella no escuchó tu respuesta, entonces ella te pregunta otra vez:

- 71: Woman [275.8s-277.6s] Do they speak English?

- 72: Profe Kyle [278.7s-282.9s] Responde, “no, ellos no hablan inglés.”

- 73: Man [284.0s-286.3s] No, they don’t speak English.

- 74: Profe Kyle [290.3s-294.7s] Ahora di “ellos hablan francés.”

- 75: Man [294.7s-296.1s] They speak French.

- 76: Woman [297.6s-299.4s] Do you speak Spanish?

- 77: Profe Kyle [300.3s-303.1s] Responde, “no, no hablo español.”

- 78: Man [304.2s-306.6s] No, I don’t speak Spanish.

- 80: Profe Kyle [310.4s-314.4s] Responde, “no, no hablamos francés.”

- 81: Man [314.8s-317.5s] No, we don’t speak French.

- 82: Woman [320.0s-323.0s] And her? Does she speak French?

- 83: Profe Kyle [323.8s-328.2s] Responde, “no, ella no habla francés.”

- 84: Man [328.8s-331.3s] No, she doesn’t speak French.

- 85: Profe Kyle [336.1s-338.4s] Di, “ella habla inglés.”

- 86: Man [339.1s-340.8s] She speaks English.

- 87: Profe Kyle [344.1s-382.5s] Recuerda que en inglés usamos los pronombres de objeto (me/me, te/you, lo/him, la/her, nos/us, los/them) para las respue

- 88: Woman [382.0s-385.0s] Walk. Walk.

- 89: Profe Kyle [387.1s-389.2s] ¿cómo se dice “andar"?

- 90: Man [390.0s-393.8s] Walk. Walk.

- 91: Profe Kyle [395.1s-397.5s] Intenta decir “ando”.

- 92: Woman [397.9s-406.0s] I walk. Walk. I walk.

- 93: Profe Kyle [402.4s-404.8s] ¿cómo se dice "ando”?

- 94: Man [405.3s-409.3s] I walk. I walk.

- 95: Profe Kyle [411.5s-413.4s] Solo escucha esta pregunta.

- 96: Woman [413.4s-414.0s] Do you walk?

- 97: Profe Kyle [415.1s-418.8s] ¿Cómo responder "sí, ando."

- 98: Man [419.2s-425.3s] Yes, I walk. Yes, I walk.

- 99: Profe Kyle [427.8s-430.3s] Hablando con un amigo, pregúntale “¿andas?".

- 100: Woman [431.1s-434.4s] Do you walk? Do you walk?

- 101: Profe Kyle [436.6s-440.4s] Otra vez, ¿Cómo preguntas "¿andas?"?

- 102: Woman [441.1s-441.9s] Do you walk?

- 103: Profe Kyle [446.2s-449.0s] Solo escucha esta respuesta.

- 104: Man [448.7s-451.6s] Yes, I walk every day.

- 105: Profe Kyle [452.3s-462.0s] Él acaba de decir “sí, ando todos los días.” Escucha y repite la frase “todos los días".

- 106: Man [462.7s-466.3s] Every day. Every day.

- 107: Profe Kyle [467.9s-470.4s] ¿Cómo se dice “todos los días”?

- 108: Woman [471.3s-474.8s] Every day. Every day.

- 109: Profe Kyle [478.2s-480.6s] Intenta preguntar, “¿él anda?”.

- 110: Woman [481.4s-485.5s] Does he walk? Does he walk?

- 111: Profe Kyle [487.8s-491.4s] Otra vez, pregunta, “¿él anda?”.

- 112: Woman [492.0s-493.0s] Does he walk?

- 113: Profe Kyle [496.0s-498.7s] Responde, “sí, él anda.”

- 114: Man [499.1s-505.4s] Yes, he walks. Yes, he walks.

- 115: Profe Kyle [508.3s-512.0s] Ahora pregunta, “¿él anda todos los días?”

- 116: Woman [512.9s-514.7s] Does he walk every day?

- 117: Profe Kyle [523.0s-526.7s] Otra vez, pregunta, “¿él anda todos los días?”

- 118: Woman [527.2s-528.6s] Does he walk every day?

- 119: Profe Kyle [532.5s-536.5s] Responde, “sí, él anda todos los días.”

- 120: Man [536.8s-546.4s] Yes, he walks every day. Yes, he walks every day.

- 121: Profe Kyle [549.5s-553.7s] Ahora pregunta, “¿ella anda todos los días?”

- 122: Woman [553.2s-559.2s] Does she walk every day? Does she walk every day?

- 123: Profe Kyle [563.4s-567.2s] Responde, “No, ella no anda todos los días.”

- 124: Man [566.8s-576.6s] No, she doesn’t walk every day. No, she doesn’t walk every day.

- 125: Profe Kyle [580.4s-582.2s] Solo escucha esta pregunta.

- 126: Woman [582.9s-584.6s] Does she speak English every day?

- 127: Profe Kyle [586.5s-590.8s] Responde, “No, ella no habla inglés todos los días.”

- 128: Man [589.7s-598.8s] No, she doesn’t speak English every day. No, she doesn’t speak English every day.

- 129: Profe Kyle [603.4s-605.0s] Solo escucha esta pregunta.

- 130: Woman [605.9s-607.8s] Does she walk to school every day?

- 131: Profe Kyle [608.6s-624.4s] Ella acaba de preguntar “¿Ella anda a la escuela todos los días?” “Does she walk to school every day?” significa “ella a

- 132: Man [624.4s-627.6s] To school. To school.

- 133: Profe Kyle [630.8s-639.2s] No, “to the school” sino “to school”. Otra vez, SOLO escucha a su pregunta:

- 134: Woman [639.2s-640.9s] Does she walk to school every day?

- 135: Profe Kyle [641.5s-646.4s] Responde “sí, ella anda a la escuela todos los días.”

- 136: Man [647.2s-658.6s] Yes, she walks to school every day. Yes, she walks to school every day.

- 137: Profe Kyle [661.6s-662.9s] Solo escucha esta pregunta.

- 138: Woman [663.7s-665.6s] Do they walk to school every day?

- 139: Profe Kyle [666.3s-671.9s] Responde “no, ellos no andan a la escuela todos los días.”

- 140: Man [672.3s-681.9s] No, they don’t walk to school every day. No, they don’t walk to school every day.

- 141: Profe Kyle [686.4s-689.6s] Di “ellos no andan a la escuela todos los días.”

- 142: Man [689.8s-693.1s] They don’t walk to school every day.

- 143: Profe Kyle [697.4s-698.7s] Solo escucha esta pregunta.

- 144: Woman [699.0s-700.0s] And you guys?

- 145: Profe Kyle [700.2s-714.5s] Ella acaba de preguntar “¿Y ustedes?” “¿Y ustedes?” lo que significa “and you guys?”. Para esta pregunta corta, solo usa

- 146: Woman [715.4s-717.5s] And you guys? Do you guys walk?

- 147: Profe Kyle [718.3s-721.0s] Responde “no, no andamos.”

- 148: Man [720.0s-727.6s] No, we don’t walk. No, we don’t walk.

- 149: Profe Kyle [730.2s-732.9s] ¿Cómo se dice “no andamos.”?

- 150: Man [733.5s-734.6s] We don’t walk.

- 151: Profe Kyle [737.5s-739.7s] Escucha esta pregunta.

- 153: Profe Kyle [741.2s-744.3s] Responde “no, no andamos a la escuela.”

- 154: Man [745.6s-748.4s] No, we don’t walk to school.

- 155: Profe Kyle [753.1s-755.8s] Di “no andamos a la escuela.”

- 156: Man [757.4s-759.5s] We don’t walk to school.

- 157: Profe Kyle [764.1s-765.3s] Escucha esta pregunta:

- 158: Woman [764.9s-767.0s] Do you guys walk to school?

- 159: Profe Kyle [767.9s-773.0s] Cómo responder “no, no andamos a la escuela todos los días.”

- 160: Man [773.6s-782.9s] No, we don’t walk to school every day. No, we don’t walk to school every day.

- 161: Profe Kyle [787.0s-791.2s] Di, “no andamos a la escuela todos los días.”

- 162: Man [792.1s-794.4s] We don’t walk to school every day.

- 163: Profe Kyle [798.5s-799.9s] Solo escucha esta pregunta.

- 164: Woman [800.6s-802.7s] Do you guys speak English every day?

- 165: Profe Kyle [803.6s-808.9s] Responde “sí, hablamos inglés todos los días.”

- 166: Man [809.1s-818.3s] Yes, we speak English every day. Yes, we speak English every day.

- 167: Profe Kyle [823.3s-825.3s] Solo escucha esta pregunta.

- 168: Woman [825.9s-828.3s] Do you guys speak English at school every day?

- 169: Profe Kyle [829.2s-845.6s] Ella acaba de preguntar, “¿ustedes hablan en la escuela todos los días?” “Do you guys speak English at school every day?

- 170: Woman [845.9s-848.5s] Do you guys speak English at school every day?

- 171: Profe Kyle [849.3s-854.7s] Responde, “sí, hablamos inglés en la escuela todos los días.”

- 172: Man [855.2s-867.1s] Yes, we speak English at school every day. Yes, we speak English at school every day.

- 173: Profe Kyle [869.6s-872.8s] Di, “hablamos inglés en la escuela.”

- 174: Man [873.6s-875.3s] We speak English at school.

- 175: Profe Kyle [877.4s-882.3s] Ahora di, “hablamos inglés en la escuela todos los días.”

- 176: Man [883.3s-886.3s] We speak English at school every day.

- 177: Profe Kyle [891.8s-896.4s] Ahora escucha la misma conversación que escuchaste al comienzo de la lección.

- 178: Man [901.4s-902.9s] Do you speak English?

- 179: Woman [903.7s-905.4s] Yes, I speak English.

- 180: Man [905.4s-908.1s] Do you speak English at school?

- 181: Woman [908.8s-911.4s] Yes, we all speak English at school.

- 182: Man [912.1s-913.3s] Do you walk to school?

- 183: Woman [913.8s-917.6s] Yes, I walk to school in the morning. Do you walk to school?

- 184: Man [918.1s-924.6s] Yes, I walk to school every day. And your friend? Do you guys walk to school together?

- 185: Woman [925.4s-929.8s] No, she doesn’t walk to school. She goes to school by motorbike.
