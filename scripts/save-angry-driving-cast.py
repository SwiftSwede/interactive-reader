#!/usr/bin/env python3
"""
save-angry-driving-cast.py — Design + SAVE the three locked Angry Driving voices
as permanent ElevenLabs voices.

LOCKED CAST (Kyle's picks after 9 audition rounds):
  BETO     = BETO-A-1    (round A, seed 60, model eleven_tts_v3,      guidance 5)
  REBECCA  = REBECCA-D-1 (round D, seed 92, model eleven_multilingual_ttv_v2, guidance 5)
  MOTHER   = MOTHER-H-2  (round I, seed 102, model eleven_multilingual_ttv_v2, guidance 5,
                          Snape-brief + LA softness)

WARNING: saving overwrites the 3 custom voice slots (Pedro / Brenda / Gordon
from Superstitious Minds). Their recipes are preserved in recreate-cast.py.

Because the earlier audition scripts did not persist generated_voice_ids,
this script re-designs each winner with identical seed/prompt/text (same
inputs -> same voice), captures the generated_voice_id, and immediately
saves it as a permanent voice. It prints old-vs-new voice_ids at the end
for voice-cast.json.

Usage: python3 scripts/save-angry-driving-cast.py
"""

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(REPO, ".env.local")
API = "https://api.elevenlabs.io/v1"

ANTIFILTER = (
    "Extremely close-mic\'d studio recording, lips nearly touching the microphone, "
    "forward proximity, noise-free signal, perfect audio quality, no reverb, no echo, "
    "dry acoustic space."
)

CAST = [
    {
        "key": "BETO",
        "name": "Beto (Angry Driving)",
        "model": "eleven_ttv_v3",
        "seed": 60,
        "guidance": 5,
        "prompt": (
            "Native Spanish (Mexican), speaking English at a near-native professional "
            "level — clear, neutral American English pronunciation with only a faint "
            "Mexican warmth underneath. Male, 35-42. Persona: hot-blooded, impatient "
            "city driver — the passionate loose cannon, quick to flare, quick to "
            "recover, wears every emotion out loud. Emotion: furious energy, loud, "
            "theatrical outrage with petulant undertones, dramatic peaks and valleys. "
            "Medium-dark warm tenor with a natural rasp that roughens when he raises "
            "his voice. Fast urgent delivery, big dynamic swings, barks then drops to "
            "mutters. " + ANTIFILTER
        ),
        "text": (
            "Come on! Move it! The speed limit is forty, people! Unbelievable. "
            "I doubt they're going to visit their racist mother-in-law. That's why I honk, babe. "
            "I'm just letting everyone know that I'm in a rush. See? Racist. What do you call that? "
            "It's not your fault, Beto. It's just in your blood."
        ),
        "labels": {"character": "Beto", "dialogue_cast": "Angry Driving", "gender": "male",
                    "accent": "mexican-near-native"},
    },
    {
        "key": "REBECCA",
        "name": "Rebecca (Angry Driving)",
        "model": "eleven_multilingual_ttv_v2",
        "seed": 92,
        "guidance": 5,
        "prompt": (
            "A woman of thirty, warm and mature. Delivery: calm, unhurried, relaxed "
            "volume — never yelling, never rushed. Key quality: audible love. She "
            "genuinely adores her husband, and it colors everything — her teasing is "
            "affectionate, her corrections are gentle, her calm is the calm of a woman "
            "who is crazy about him. Warmth forward: soft smiles in the voice, tender "
            "patience, a hint of a laugh under the surface. Personality: gently bubbly, "
            "quietly confident, sweet but not naive, playful but never shrill. The voice "
            "of a wife holding her hot-headed husband's hand metaphorically, all the way "
            "home."
        ),
        "text": (
            "Babe. Let's calm down. How is honking gonna make traffic move faster? "
            "I'm sure everyone is in a rush, just like you. That's why they call it rush hour. "
            "Come on, my love. We'll be there soon. "
            "Beto Manuel Castillo Gonzalez. Pull over the god damn car THIS INSTANT!"
        ),
        "labels": {"character": "Rebecca", "dialogue_cast": "Angry Driving", "gender": "female",
                    "accent": "american"},
    },
    {
        "key": "MOTHER",
        "name": "Mother (Angry Driving)",
        "model": "eleven_multilingual_ttv_v2",
        "seed": 102,
        "guidance": 5,
        "prompt": (
            "Voice reference: the late Alan Rickman's Professor Snape — but a woman. "
            "An American woman around sixty from Los Angeles. Low, silken female voice "
            "with a slow, velvety drawl. She speaks deliberately, releasing each word "
            "reluctantly, as if every syllable costs her something. Frequent dramatic "
            "pauses, especially before the word that hurts. Soft-spoken and unhurried, "
            "with polished, precise diction — every consonant placed like a scalpel. "
            "Quiet, ironic contempt; velvet menace. Never warm, never hurried, never "
            "loud, never gravelly — smooth as silk the whole way through. The most "
            "frightening thing about her is how calm she always is. Slight Los Angeles "
            "softness in the vowels — an American accent with the coastal smoothness of "
            "old-money Southern California."
        ),
        "text": (
            "Beto. <break time=\"0.7s\" /> You're late. "
            "<break time=\"0.7s\" /> I texted you thirty minutes ago. "
            "<break time=\"0.7s\" /> But of course... your phone is for your mother in Mexico. "
            "<break time=\"0.8s\" /> Not for your mother-in-law... who is standing on the freeway."
        ),
        "labels": {"character": "Mother", "dialogue_cast": "Angry Driving", "gender": "female",
                    "accent": "american-la"},
    },
]


def load_api_key():
    with open(ENV_PATH) as f:
        for line in f:
            if line.startswith("ELEVENLABS_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("ELEVENLABS_API_KEY not found in " + ENV_PATH)


def post(key, path, body, timeout=180):
    req = urllib.request.Request(
        f"{API}{path}",
        data=json.dumps(body).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def main():
    key = load_api_key()
    results = {}
    for c in CAST:
        print(f"=== {c['key']}: design (seed {c['seed']}, guidance {c['guidance']})")
        design = post(key, "/text-to-voice/design", {
            "voice_description": c["prompt"],
            "text": c["text"],
            "model_id": c["model"],
            "seed": c["seed"],
            "guidance_scale": c["guidance"],
        })
        gid = design["previews"][0]["generated_voice_id"]
        print(f"    generated_voice_id: {gid}")
        time.sleep(1)
        saved = post(key, "/text-to-voice", {
            "voice_name": c["name"],
            "voice_description": c["prompt"],
            "generated_voice_id": gid,
            "labels": c["labels"],
        })
        print(f"    SAVED {c['name']}: voice_id {saved['voice_id']}")
        results[c["key"]] = {"voice_id": saved["voice_id"], "from": c["name"],
                              "seed": c["seed"], "model": c["model"]}
        time.sleep(1)

    out = os.path.join(REPO, "scripts", "angry-driving-cast-saved.json")
    with open(out, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nAll saved. Mapping written to {out}")
    print("Next: merge into scripts/voice-cast.json casts.angry-driving.")


if __name__ == "__main__":
    main()
