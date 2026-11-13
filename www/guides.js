/* ============================================================
   RescueNet Resident App — Interactive Emergency Guides
   Loaded from dashboard.html. Fully offline. Zero dependencies.
   ============================================================ */
(function () {
    'use strict';

    // ------------------------------------------------------------
    // Inline SVG icons (24x24, stroke-based, match app aesthetic)
    // ------------------------------------------------------------
    const I = {
        wind:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h7a3 3 0 1 0 3-3"/></svg>',
        quake:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>',
        flood:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M2 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M2 20c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M7 10l5-6 5 6"/></svg>',
        fire:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 1-3s-4 3-4 8a7 7 0 0 0 14 0c0-6-7-13-7-13z"/></svg>',
        volcano:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18l-6-11-3 3-3-5z"/><path d="M12 4v3M9 5l1 2M15 5l-1 2"/></svg>',
        landslide: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20 12 4l9 16z"/><path d="M8 14h8M6 18h12"/></svg>',
        tsunami:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18c3 0 3-4 6-4s3 4 6 4 3-4 6-4 2 4 2 4"/><path d="M6 12c3-4 6-4 9 0"/><path d="M12 4v4"/></svg>',
        bolt:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
        home:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10 12 3l9 7v11H3z"/><path d="M9 21v-6h6v6"/></svg>',
        school:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 8l10 5 10-5z"/><path d="M6 12v5c0 2 3 4 6 4s6-2 6-4v-5"/></svg>',
        users:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        route:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h6a3 3 0 0 0 3-3V8"/></svg>',
        phone:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/></svg>',
        heart:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
        kit:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="14" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2M12 12v6M9 15h6"/></svg>',
        check:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>',
        warn:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
        shield:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6z"/></svg>',
        chev:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    };
    const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>';

    // ------------------------------------------------------------
    // Storage helpers
    // ------------------------------------------------------------
    function loadObj(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
    function saveObj(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

    // ------------------------------------------------------------
    // Content — real, substantive, curated for Philippine context
    // ------------------------------------------------------------
    const DATA = {
        disaster: {
            kicker: 'Know the hazards',
            title: 'Disaster Information',
            desc: 'The most common hazards in the Philippines — their warning signs and the specific actions that save lives.',
            type: 'accordion',
            items: [
                {
                    icon: 'wind', name: 'Typhoon (Bagyo)', sub: 'Signal #1 – #4 · storm surge · 3-hourly updates',
                    sections: [
                        { h: 'Warning signs', kind: 'list', items: [
                            'Sudden drop in pressure; sea level recedes sharply',
                            'Big, dark, low clouds moving steadily in one direction',
                            'Rain blowing horizontally; wind shifts direction abruptly',
                            'PAGASA raises Wind Signal #1 (30–60 kph)'
                        ]},
                        { h: 'Before landfall', kind: 'steps', items: [
                            'Charge phones and power banks; fill every water container',
                            'Trim trees, secure roof sheets, tape windows in an X',
                            'Know your nearest evacuation center and the route to it',
                            'Photograph documents and store in a waterproof bag'
                        ]},
                        { h: 'During', kind: 'steps', items: [
                            'Stay inside, away from windows. Move to the lowest safe room',
                            'If the roof tears off, shield head and neck with a mattress',
                            'Do not go out during the eye — the storm resumes within minutes',
                            'Monitor battery radio for PAGASA updates'
                        ]},
                        { h: 'After', kind: 'list', items: [
                            'Watch for downed live wires, flooded drains, weakened trees',
                            'Boil drinking water until authorities declare it safe',
                            'Photograph damage before cleanup for insurance and LGU aid'
                        ]}
                    ],
                    callout: { kind: 'warn', text: '<b>Signal #4 (220+ kph)</b> means total evacuation of coastal and low-lying areas is mandatory. Do not wait for the flood.' }
                },
                {
                    icon: 'quake', name: 'Earthquake', sub: 'West Valley Fault · Philippine Fault Zone',
                    sections: [
                        { h: 'Warning signs', kind: 'list', items: [
                            'Distant rumbling; animals behaving strangely',
                            'Objects swinging before you feel the shaking',
                            'PHIVOLCS PRELIMS / earthquake bulletins'
                        ]},
                        { h: 'DROP – COVER – HOLD ON', kind: 'steps', items: [
                            '<b>DROP</b> on hands and knees before shaking throws you',
                            '<b>COVER</b> under a sturdy desk; protect head and neck',
                            '<b>HOLD ON</b> to your shelter until shaking stops',
                            'If no shelter, crawl to an interior corner — <b>never run outside</b> during shaking'
                        ]},
                        { h: 'After', kind: 'list', items: [
                            'Expect aftershocks for hours to weeks — do not re-enter damaged buildings',
                            'Check gas, water, electric. If you smell gas, open windows and leave',
                            'Move to high ground if near the coast — tsunami may follow'
                        ]}
                    ],
                    callout: { kind: 'err', text: '<b>Never use elevators, never light matches, never stand under a balcony.</b> Three top causes of quake deaths.' }
                },
                {
                    icon: 'flood', name: 'Flood (Baha)', sub: 'Flash flood · urban flooding · lahar',
                    sections: [
                        { h: 'Warning signs', kind: 'list', items: [
                            'Rivers rising fast after sustained rain upstream',
                            'Muddy water entering streets; drains reversing',
                            'Barangay alarm or megaphone warning'
                        ]},
                        { h: 'Do', kind: 'steps', items: [
                            'Move to a higher floor immediately — do not wait for water at the door',
                            'Turn off the main breaker if it is safe to reach',
                            'Grab your go-bag (IDs, meds, water) and evacuate on foot',
                            'If trapped on roof, wave a bright cloth or shine a torch at night'
                        ]},
                        { h: 'Never', kind: 'list', items: [
                            'Walk through moving water above the knee — 15 cm can knock you down',
                            'Drive through flooded roads — 30 cm floats most cars',
                            'Return home until officials declare water safe (leptospirosis risk)'
                        ]}
                    ],
                    callout: { kind: 'info', text: 'Do not cross a flooded river on a rope or bamboo bridge. This is the #1 cause of avoidable typhoon deaths in the Philippines.' }
                },
                {
                    icon: 'fire', name: 'Structural Fire (Sunog)', sub: 'House fire · electrical · LPG',
                    sections: [
                        { h: 'Prevention', kind: 'list', items: [
                            'One high-wattage appliance per outlet (AC, ref, microwave)',
                            'Replace any cord that is warm, brittle, or has exposed copper',
                            'Test smoke alarm monthly; keep an extinguisher or bucket of sand',
                            'Sleep with the bedroom door closed — it slows fire and smoke by 30 min'
                        ]},
                        { h: 'Escape plan', kind: 'steps', items: [
                            'Feel the door with the back of your hand before opening — hot means fire on the other side',
                            'Crawl low under smoke; air is cleanest 30 cm above the floor',
                            'Use the two exits you pre-planned. Never re-enter for belongings',
                            'If clothes catch fire: <b>STOP, DROP, ROLL</b>'
                        ]},
                        { h: 'If trapped', kind: 'list', items: [
                            'Close doors, seal cracks with a wet cloth',
                            'Open a window, wave a bright cloth or shout at regular intervals',
                            'Call 911 or BFP with your exact address'
                        ]}
                    ]
                },
                {
                    icon: 'volcano', name: 'Volcanic Eruption', sub: 'Mayon · Taal · Pinatubo · Kanlaon',
                    sections: [
                        { h: 'Alert levels (PHIVOLCS)', kind: 'list', items: [
                            '<b>ALERT 1</b> – Rising magma, increase in earthquakes',
                            '<b>ALERT 2</b> – Frequent quakes, ash emission, imminent eruption',
                            '<b>ALERT 3</b> – Eruption in progress, mandatory evacuation of danger zones',
                            '<b>ALERT 4</b> – Destructive eruption ongoing'
                        ]},
                        { h: 'Ash protection', kind: 'steps', items: [
                            'Wet cloth or N95 mask over nose and mouth',
                            'Long sleeves, goggles, hat — ash irritates skin and eyes',
                            'Do NOT drive in heavy ash — engines stall',
                            'Sweep ash off the roof daily and wet it down; 15 cm of ash collapses corrugated roofs'
                        ]},
                        { h: 'Lahar (volcanic mudflow)', kind: 'list', items: [
                            'Rivers of mud triggered by rain falling on ash deposits',
                            'Move perpendicular to the flow, to high ground — never downstream'
                        ]}
                    ]
                },
                {
                    icon: 'landslide', name: 'Landslide', sub: 'Steep slopes · quarry cuts · deforested hills',
                    sections: [
                        { h: 'Warning signs', kind: 'list', items: [
                            'New cracks in the ground or hillside',
                            'Doors or windows suddenly jam',
                            'Trees or telephone poles leaning',
                            'Unusual rumbling or roaring from the slope'
                        ]},
                        { h: 'If you feel it', kind: 'steps', items: [
                            'Run <b>sideways</b> away from the slide path — never downhill with it',
                            'If trapped, curl into a ball and cover your head',
                            'Do NOT return for family members until rescuers arrive'
                        ]}
                    ],
                    callout: { kind: 'warn', text: 'Homes built on fill dirt or old quarry cuts are the highest-risk structures after typhoons.' }
                },
                {
                    icon: 'tsunami', name: 'Tsunami', sub: 'Ocean retreat · quakes above 7.0 near coast',
                    sections: [
                        { h: 'Natural warning signs', kind: 'list', items: [
                            'Ocean suddenly pulls back, exposing the seabed',
                            'Strong long earthquake (60+ seconds) near the coast',
                            'Unusual roaring from the sea'
                        ]},
                        { h: 'Action', kind: 'steps', items: [
                            'Do not wait for an official warning — evacuate immediately',
                            'Move to higher ground (15 m+ elevation) or 1 km inland',
                            'If caught, climb a sturdy concrete structure roof — do not swim',
                            'Stay high for 2+ hours; the first wave is rarely the largest'
                        ]}
                    ]
                },
                {
                    icon: 'bolt', name: 'Lightning & Thunderstorm', sub: 'Most common weather killer in PH',
                    sections: [
                        { h: 'The 30/30 rule', kind: 'list', items: [
                            'If flash-to-bang is under 30 seconds, you are in danger',
                            'Wait 30 minutes after the last thunder before going back out'
                        ]},
                        { h: 'Safe / unsafe', kind: 'list', items: [
                            'SAFE: enclosed building with wiring/plumbing, hard-top vehicle',
                            'UNSAFE: isolated tree, open field, water, metal fence, beach umbrella',
                            'If caught outside: feet together, crouch low, hands over ears — <b>never lie flat</b>'
                        ]}
                    ]
                }
            ]
        },

        safety: {
            kicker: 'Everyday prevention',
            title: 'Safety Reminders',
            desc: 'Small habits that prevent most household and community emergencies.',
            type: 'tabs',
            tabs: [
                { name: 'Home', icon: 'home', sections: [
                    { h: 'Electrical', kind: 'list', items: [
                        'One high-wattage appliance per outlet (AC, ref, microwave)',
                        'Replace any cord that is warm, brittle, or has exposed copper',
                        'Install a dedicated breaker for the kitchen and washing area',
                        'Never run cords under rugs or across doorways'
                    ]},
                    { h: 'Gas & cooking', kind: 'list', items: [
                        'Check LPG hose with soap-water weekly — bubbles mean a leak',
                        'Never leave cooking unattended; keep curtains away from the stove',
                        'Store the LPG tank outside, valve up, chained',
                        'Fire triangle: heat + fuel + oxygen. Kill one to stop a fire'
                    ]},
                    { h: 'Children & elderly', kind: 'list', items: [
                        'Lock away meds, cleaners, knives, and small magnets',
                        'Empty buckets after mopping — infants drown in 2 cm of water',
                        'Night-light in the bathroom and hallway to prevent falls'
                    ]}
                ], callout: { kind: 'warn', text: '<b>7 out of 10 house fires start in the kitchen.</b> Never cook while sleepy or intoxicated.' }},
                { name: 'School', icon: 'school', sections: [
                    { h: 'For students', kind: 'list', items: [
                        'Know two exits and your class\'s evacuation assembly point',
                        'Never run in hallways during drills — trampling kills more than the hazard',
                        'Report broken handrails, exposed wires, or leaking roofs to a teacher',
                        'Keep your phone charged and ICE contact on the lock-screen'
                    ]},
                    { h: 'For parents', kind: 'list', items: [
                        'Update the school emergency contact every semester',
                        'Agree on a reunion point if pickup is impossible during a disaster',
                        'Pack a small go-bag in the school bag: water, biscuit, whistle, wet wipes'
                    ]},
                    { h: 'Bullying & online', kind: 'list', items: [
                        'Screenshot threats; report to adviser and parents; do not reply',
                        'Never share location, school uniform photo, or home address publicly'
                    ]}
                ]},
                { name: 'Community', icon: 'users', sections: [
                    { h: 'Know your block', kind: 'list', items: [
                        'Learn the location of the nearest AED, fire extinguisher, hydrant',
                        'Identify neighbors who are elderly, PWD, infant, or on oxygen',
                        'Join or form a Barangay Disaster Risk Reduction Committee (BDRRMC)'
                    ]},
                    { h: 'Report hazards', kind: 'list', items: [
                        'Clogged canal → barangay captain + 911 non-emergency',
                        'Illegal dumping → DENR hotline (02) 8256-9881',
                        'Downed wire → local electric cooperative immediately; keep 10 m away'
                    ]},
                    { h: 'During emergencies', kind: 'list', items: [
                        'Do not create rumors in group chats — verify with official channels',
                        'Give way to ambulances and fire trucks; pull to the right and stop',
                        'Do not rubberneck accidents — you block responders'
                    ]}
                ]},
                { name: 'Road', icon: 'route', sections: [
                    { h: 'Defensive driving', kind: 'list', items: [
                        'Two-second following distance in dry, four seconds in rain',
                        'Never use your phone while driving — pull over',
                        'Headlights on during rain, even in daytime',
                        'Scan 15 seconds ahead for brake lights and opening doors'
                    ]},
                    { h: 'Motorcycles & bicycles', kind: 'list', items: [
                        'Always wear an approved helmet, chin strap buckled',
                        'Ride where drivers can see you; wear reflective strips at night',
                        'Never lane-split during heavy rain or on slick paint'
                    ]},
                    { h: 'Pedestrians', kind: 'list', items: [
                        'Cross at designated lanes; make eye contact with drivers',
                        'Put the phone away — distracted walking is a top injury cause'
                    ]}
                ], callout: { kind: 'err', text: 'Road crashes kill 6 Filipinos every hour. Speed, drunk driving, and no helmet are the top three factors.' }}
            ]
        },

        procedures: {
            kicker: 'The three phases',
            title: 'Emergency Procedures',
            desc: 'A universal framework: what to do <b>before</b> disaster strikes, <b>during</b> the event, and <b>after</b> — for you and your family.',
            type: 'tabs',
            tabs: [
                { name: 'Before', icon: 'shield', sections: [
                    { h: 'Family emergency plan', kind: 'steps', items: [
                        'Pick two meeting points: one near home, one outside your barangay',
                        'Choose an out-of-town contact everyone can call',
                        'Every member memorizes phone numbers of 2 relatives + 911',
                        'Practice evacuation twice a year — walk the route, time it'
                    ]},
                    { h: 'Documents to safeguard', kind: 'list', items: [
                        'Birth/marriage certificates, land title, IDs, passport, vax card',
                        'Insurance, medical records, prescription list, spare keys',
                        'Physical copies in a fireproof bag + scans in email or cloud'
                    ]},
                    { h: 'Home hardening', kind: 'list', items: [
                        'Clean gutters and drains before rainy season',
                        'Trim branches overhanging the roof or powerline',
                        'Anchor the water tank, satellite dish, and roof sheets'
                    ]}
                ]},
                { name: 'During', icon: 'warn', sections: [
                    { h: 'Universal rules', kind: 'steps', items: [
                        '<b>STOP.</b> Take 3 slow breaths — panic kills more than hazards',
                        '<b>LOOK.</b> Identify the actual threat: fire? water? falling debris?',
                        '<b>ACT.</b> Follow the specific procedure for that hazard',
                        '<b>COMMUNICATE.</b> One short text: "SAFE / evacuating to X" — do not call if lines are jammed'
                    ]},
                    { h: 'Communication discipline', kind: 'list', items: [
                        'Text <b>before</b> calling — SMS works when voice fails',
                        'Use one designated contact as the family information hub',
                        'Conserve phone battery: brightness low, airplane mode when not sending',
                        'Battery radio + PAGASA/LGU Facebook page as backup'
                    ]},
                    { h: 'When to evacuate', kind: 'callout', text: '<b>Immediately, without waiting for permission, when:</b> you see the hazard approaching, your structure is damaged, or barangay gives a mandatory order. Nothing you own is worth your life.' }
                ]},
                { name: 'After', icon: 'check', sections: [
                    { h: 'First 30 minutes', kind: 'steps', items: [
                        'Head-count your household at the meeting point',
                        'Check for injuries — apply first aid before moving injured people',
                        'Photograph damage from a safe distance for claims',
                        'Report casualties to barangay health worker or 911'
                    ]},
                    { h: 'First 72 hours', kind: 'list', items: [
                        'Boil or treat all drinking water',
                        'Sleep in a declared safe structure — not your damaged home',
                        'Watch for snakes, rats, scorpions displaced by flood',
                        'Keep children away from debris piles and flood water'
                    ]},
                    { h: 'Recovery', kind: 'list', items: [
                        'Get a barangay certification of damage for government aid',
                        'File insurance claims within 30 days with photos + police blotter',
                        'Watch for mental-health signals in kids — nightmares, regression, refusal to eat'
                    ]}
                ]}
            ]
        },

        firstaid: {
            kicker: 'The first 4 minutes matter',
            title: 'First Aid',
            desc: 'Step-by-step protocols you can perform while waiting for EMS. Always call 911 first, then begin care.',
            type: 'tabs',
            tabs: [
                { name: 'CPR', icon: 'heart', tone: 'danger', custom: 'cpr',
                  callout: { kind: 'err', text: 'Every minute without CPR drops survival by <b>10%</b>. Start within 60 seconds of collapse.' }},
                { name: 'Bleeding', icon: 'heart', tone: 'danger', custom: 'bleed',
                  callout: { kind: 'err', text: 'Severe bleeding can be fatal in <b>3–5 minutes</b>. Press hard, add cloth on top, and do not let go.' }},
                { name: 'Burns', icon: 'fire', tone: 'warn', sections: [
                    { h: 'Cool it — first 20 minutes', kind: 'steps', items: [
                        'Hold the burn under <b>cool running water</b> for 20 minutes (not ice, not ice water)',
                        'Remove rings, watches, tight clothing near the area before swelling starts',
                        'Do NOT pop blisters — the skin underneath is sterile'
                    ]},
                    { h: 'Cover', kind: 'steps', items: [
                        'Loosely cover with clean, non-fluffy cloth or cling film (do not wrap tight)',
                        'Do not apply butter, oil, toothpaste, egg, or "burn oil"'
                    ]},
                    { h: 'Seek emergency care when', kind: 'list', items: [
                        'Burn is larger than the victim\'s palm',
                        'White, charred, or painless skin (3rd degree)',
                        'Face, hands, feet, genitals, joints, or airway involved',
                        'Electrical or chemical burn (may look small but destroys deep tissue)'
                    ]}
                ], callout: { kind: 'warn', text: '<b>The 20-minute cool-water rule</b> is the single most effective first-aid action — reduces depth of injury and pain.' }},
                { name: 'Choking', icon: 'warn', tone: 'danger', sections: [
                    { h: 'Can they cough or speak?', kind: 'list', items: [
                        'Yes, forceful cough → encourage coughing, do NOT intervene',
                        'Silent, cannot breathe, clutching throat → begin abdominal thrusts'
                    ]},
                    { h: 'Heimlich (adults & children > 1 yr)', kind: 'steps', items: [
                        'Stand behind, one foot between theirs. Wrap arms around waist',
                        'Make a fist thumb-side in, above the navel, below the ribs',
                        'Grasp fist with the other hand. <b>Quick upward thrusts</b> — 5 in a row',
                        'Repeat until object comes out or victim goes unconscious'
                    ]},
                    { h: 'Infants under 1 year', kind: 'steps', items: [
                        'Face-down along your forearm, head lower than body, support jaw',
                        '<b>5 back slaps</b> between shoulder blades with heel of hand',
                        'Turn face-up, <b>5 chest thrusts</b> with 2 fingers on sternum',
                        'Alternate until object clears. Never use Heimlich on an infant'
                    ]},
                    { h: 'If they pass out', kind: 'list', items: [
                        'Lay flat, begin CPR — each time you open the airway, look for the object',
                        'Never do blind finger sweeps — you push it deeper'
                    ]}
                ]},
                { name: 'Fractures', icon: 'kit', tone: 'warn', custom: 'frac',
                  callout: { kind: 'warn', text: '<b>Do not move the person</b> if you suspect a spine or neck injury — hold the head in line with the body and wait for trained responders.' }},
                { name: 'Wounds', icon: 'heart', tone: 'ok', custom: 'wound',
                  callout: { kind: 'warn', text: 'Any <b>puncture, rusty, or animal-bite</b> wound needs medical care — tetanus or rabies risk. Bites: wash 15 min, then an Animal Bite Center within <b>24 hours</b>.' }},
            ]
        },

        evacuation: {
            kicker: 'Leave early, leave safely',
            title: 'Evacuation Guide',
            desc: 'How to plan, pack, move, register, and reunite your household during a mandatory or self-initiated evacuation.',
            type: 'tabs',
            tabs: [
                { name: 'Evacuate', icon: 'route', custom: 'evac',
                  callout: { kind: 'warn', text: '<b>Leave early.</b> Evacuate when the barangay says so — not when the water is already at your door. Routes flood and close fast, so the go-bag and your plan must be ready before you need them.' } },
                { name: 'Pack', icon: 'kit', sections: [
                    { h: 'Go-bag priority order', kind: 'steps', items: [
                        '1. Prescription meds (7 days), first aid kit, glasses',
                        '2. IDs + cash (small bills) in a waterproof pouch',
                        '3. Water (1L per person) + high-energy food',
                        '4. Torch + batteries + power bank + whistle',
                        '5. Change of clothes + rain jacket + sturdy slippers',
                        '6. Phone + charger, battery radio',
                        '7. Baby supplies, sanitary pads, wet wipes, trash bags'
                    ]},
                    { h: 'Do NOT pack', kind: 'list', items: [
                        'Laptops, heirlooms, framed photos — you can replace things, not people',
                        'Anything you cannot carry in one backpack comfortably for 2 km'
                    ]}
                ]},
                { name: 'Travel', icon: 'home', sections: [
                    { h: 'On foot', kind: 'list', items: [
                        'Wear closed shoes and reflective or bright clothing',
                        'Walk facing traffic if on road; children between adults, hold a rope',
                        'Do not cross flooded sections — detour, even if it adds 20 minutes',
                        'Whistle signal agreed in family: <b>3 blasts = stop / regroup</b>'
                    ]},
                    { h: 'By vehicle', kind: 'list', items: [
                        'If water stalls the engine, abandon the vehicle and continue on foot',
                        'Never drive through moving water above 30 cm'
                    ]}
                ]},
                { name: 'My Household', icon: 'users', custom: 'headcount' },
                { name: 'At center', icon: 'check', sections: [
                    { h: 'Register on arrival', kind: 'steps', items: [
                        'Report to the evacuation registration desk with your family head-count',
                        'Give names, ages, and medical needs of every member',
                        'Ask which section your family is assigned to; memorize it'
                    ]},
                    { h: 'Hygiene & safety', kind: 'list', items: [
                        'Wash hands with soap before eating — cholera/dysentery risk rises fast',
                        'Sleep on a raised surface; keep your bag under your head to prevent theft',
                        'Report fever, cough, or wound to the health worker immediately',
                        'Do not cook inside the sleeping area; use the designated kitchen zone'
                    ]},
                    { h: 'Do not return home', kind: 'callout', text: 'Until the barangay or LGU declares the area safe. Even after water recedes, live wires, snakes, and structural collapse are still active hazards.' }
                ]}
            ]
        },

        kit: {
            kicker: 'Interactive checklist',
            title: '72-Hour Emergency Kit',
            desc: 'What to pack for 3 days of self-sufficiency. <b>Tap items to mark them as packed</b> — your progress is saved on this device.',
            type: 'checklist',
            storageKey: 'rn_kit_v1',
            categories: [
                { name: 'Water', items: [
                    { id: 'w1', label: 'Drinking water 3L per person', note: '1 gallon ≈ 3 days for 1 adult' },
                    { id: 'w2', label: 'Water purification tablets / unscented bleach' },
                    { id: 'w3', label: 'Reusable water container (empty for refilling)' }
                ]},
                { name: 'Food', items: [
                    { id: 'f1', label: 'Canned goods (tuna, sardines, corned beef) × 6', note: 'Choose food you actually eat' },
                    { id: 'f2', label: 'Biscuits, peanuts, dried fruit' },
                    { id: 'f3', label: 'Instant noodles or rice (needs water + heat)' },
                    { id: 'f4', label: 'Can opener + spoon + mug' },
                    { id: 'f5', label: 'Baby formula, baby food if applicable' },
                    { id: 'f6', label: 'Pet food + leash if applicable' }
                ]},
                { name: 'Light & Comms', items: [
                    { id: 'l1', label: 'Flashlight or headlamp' },
                    { id: 'l2', label: 'Extra batteries (D, AA, AAA)' },
                    { id: 'l3', label: 'Power bank, fully charged' },
                    { id: 'l4', label: 'Phone charging cable' },
                    { id: 'l5', label: 'Battery-powered radio', note: 'PAGASA updates when data is down' },
                    { id: 'l6', label: 'Whistle', note: 'Louder than shouting, uses no energy' },
                    { id: 'l7', label: 'Waterproof bag for phone + documents' }
                ]},
                { name: 'First Aid & Medical', items: [
                    { id: 'm1', label: 'First aid kit (bandages, gauze, tape, antiseptic)' },
                    { id: 'm2', label: '7-day supply of prescription medicine' },
                    { id: 'm3', label: 'Pain reliever (paracetamol / ibuprofen)' },
                    { id: 'm4', label: 'Anti-diarrhea, antacid, oral rehydration salts' },
                    { id: 'm5', label: 'Tweezers, scissors, safety pins' },
                    { id: 'm6', label: 'Face masks (N95 + surgical)' },
                    { id: 'm7', label: 'Gloves (nitrile)' },
                    { id: 'm8', label: 'Copies of prescriptions + medical history' }
                ]},
                { name: 'Documents', items: [
                    { id: 'd1', label: 'Government IDs — photocopies in waterproof pouch' },
                    { id: 'd2', label: 'Birth / marriage certificates' },
                    { id: 'd3', label: 'Land title or lease contract copies' },
                    { id: 'd4', label: 'Insurance policies + emergency contact sheet' },
                    { id: 'd5', label: 'Passport / school IDs for kids' },
                    { id: 'd6', label: 'Cash in small bills (₱1,000–₱3,000)', note: 'ATMs and digital payments fail first' }
                ]},
                { name: 'Tools & Shelter', items: [
                    { id: 't1', label: 'Multi-tool or pocket knife' },
                    { id: 't2', label: 'Duct tape + plastic sheeting (tarp)' },
                    { id: 't3', label: 'Work gloves' },
                    { id: 't4', label: 'Matches in a waterproof container / lighter' },
                    { id: 't5', label: 'Portable stove + fuel' },
                    { id: 't6', label: 'Rope or paracord 10 m' },
                    { id: 't7', label: 'Emergency blanket (mylar)' }
                ]},
                { name: 'Clothing & Personal', items: [
                    { id: 'c1', label: 'One change of clothes per person' },
                    { id: 'c2', label: 'Rain jacket or poncho' },
                    { id: 'c3', label: 'Sturdy closed shoes' },
                    { id: 'c4', label: 'Underwear + socks × 3' },
                    { id: 'c5', label: 'Toothbrush, toothpaste, soap, shampoo' },
                    { id: 'c6', label: 'Sanitary pads, diapers, wet wipes' },
                    { id: 'c7', label: 'Trash bags (multi-purpose)' },
                    { id: 'c8', label: 'Eyeglasses or spare contacts' }
                ]}
            ]
        },

        hotlines: {
            kicker: 'Tap to call',
            title: 'Emergency Hotlines',
            desc: 'Philippine national emergency numbers and Western Visayas area hotlines. Most work even without load; 911 also accepts SMS.',
            type: 'hotlines',
            groups: [
                { name: 'National emergency', items: [
                    { name: 'Emergency hotline', num: '911', note: 'Police + Fire + Medical dispatch' },
                    { name: 'Philippine Red Cross', num: '143' },
                    { name: 'NDRRMC Operations Center', num: '(02) 8911-1406' },
                    { name: 'PNP (National Police)', num: '117' },
                    { name: 'Bureau of Fire Protection', num: '(02) 8426-0219' }
                ]},
                { name: 'Weather & geohazard', items: [
                    { name: 'PAGASA (weather)', num: '(02) 8284-0800' },
                    { name: 'PHIVOLCS (quake / volcano)', num: '(02) 8373-2335' },
                    { name: 'PAGASA flood forecast', num: '(02) 8284-0360' }
                ]},
                { name: 'Western Visayas & Capiz area', items: [
                    { name: 'Provincial Capitol, Roxas City', num: '(036) 884-0602' },
                    { name: 'Capiz Provincial PDRRMO', num: '(036) 888-2131' },
                    { name: 'Roxas City City Hall', num: '(036) 897-0243' },
                    { name: 'Roxas District Hospital', num: '(036) 888-2151' },
                    { name: 'Bacolod City rescue hotline', num: '(034) 433-2122' },
                    { name: 'Iloilo Provincial Capitol', num: '(033) 335-0311' }
                ]},
                { name: 'Utilities & roads', items: [
                    { name: 'REPCO / electric cooperative (Capiz)', num: '(036) 888-2031' },
                    { name: 'Maynilad water', num: '151' },
                    { name: 'DPWH road emergency', num: '(02) 8342-0818' },
                    { name: 'MMDA Traffic', num: '136' }
                ]}
            ],
            callout: { kind: 'info', text: '<b>Save 3 hotlines as contacts on your phone right now.</b> When the network is congested, SMS and voice both drop — but SMS often slips through.' }
        }
    };

    // ------------------------------------------------------------
    // Renderers
    // ------------------------------------------------------------
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderCallout(c) {
        if (!c) return '';
        const kind = c.kind || 'info';
        const html = typeof c === 'string' ? c : c.text;
        return '<div class="g-callout ' + kind + '">' + html + '</div>';
    }

    function renderSection(sec) {
        if (!sec) return '';
        let body = '';
        if (sec.kind === 'steps') {
            body = '<ol class="g-steps">' + sec.items.map(i => '<li>' + i + '</li>').join('') + '</ol>';
        } else if (sec.kind === 'list') {
            body = '<ul class="g-list">' + sec.items.map(i => '<li>' + i + '</li>').join('') + '</ul>';
        } else if (sec.kind === 'callout') {
            body = renderCallout({ kind: 'info', text: sec.text });
        } else {
            body = '<div class="g-card"><div class="g-s">' + (sec.items ? sec.items.join('<br>') : (sec.p || '')) + '</div></div>';
        }
        return '<div class="g-sec"><h4>' + esc(sec.h) + '</h4>' + body + '</div>';
    }

    function renderAccordion(items) {
        return items.map((it, i) => {
            const iconSvg = I[it.icon] || I.warn;
            const body = (it.sections || []).map(renderSection).join('') + renderCallout(it.callout);
            return '' +
                '<div class="g-acc" data-acc-idx="' + i + '">' +
                    '<div class="g-hd">' +
                        '<div class="g-ic">' + iconSvg + '</div>' +
                        '<div style="flex:1;min-width:0;">' +
                            '<div class="g-tt">' + esc(it.name) + '</div>' +
                            (it.sub ? '<div class="g-st">' + esc(it.sub) + '</div>' : '') +
                        '</div>' +
                        '<div class="g-chev">' + I.chev + '</div>' +
                    '</div>' +
                    '<div class="g-bd">' + body + '</div>' +
                '</div>';
        }).join('');
    }

    // ------------------------------------------------------------
    // CPR 60-second walkthrough (First Aid → CPR tab)
    // Scoped port of the standalone "CPR in 60 seconds" animation. Its CSS
    // lives in dashboard.html (every rule gated behind .g-cpr); the markup is
    // injected below and initCPR() wires it up right after the guide renders.
    // ------------------------------------------------------------
    const CPR_HTML =
        '<div class="g-cpr"><div class="cpr-main">' +
            '<h1>How to do CPR on an adult: 60-second walkthrough</h1>' +
            '<div class="stage">' +
            '<svg viewBox="0 0 800 400" role="img" aria-label="Animated side view of a rescuer kneeling beside an adult on the floor, pressing the centre of the chest with straight arms and shoulders over the hands">' +
            '<rect x="0" y="362" width="800" height="38" fill="var(--floor)" opacity=".35"/>' +
            '<line x1="0" y1="362" x2="800" y2="362" stroke="var(--floor)" stroke-width="3"/>' +
            '<ellipse cx="380" cy="365" rx="260" ry="6" fill="#000" opacity=".12"/>' +
            '<g id="rBack">' +
            ' <g id="rb">' +
            '  <path d="M212,182 Q212,156 238,152 L258,148 L286,148 L306,152 Q332,156 332,182 L338,350 L206,350 Z" fill="var(--rescuer)"/>' +
            '  <rect x="262" y="124" width="20" height="28" fill="var(--skin)"/>' +
            '  <ellipse cx="272" cy="104" rx="21" ry="28" fill="var(--skin)"/>' +
            '  <path d="M251,100 Q250,76 272,76 Q294,76 293,100 Q282,88 272,90 Q260,88 251,100 Z" fill="var(--hair)"/>' +
            '  <circle cx="263" cy="108" r="2.2" fill="var(--fg)"/><circle cx="281" cy="108" r="2.2" fill="var(--fg)"/>' +
            '  <path d="M265,120 Q272,125 279,120" stroke="var(--fg)" stroke-width="2" fill="none" stroke-linecap="round"/>' +
            ' </g>' +
            ' <g stroke-linecap="round">' +
            '  <line id="aLs" stroke="var(--rescuer)" stroke-width="15"/><line id="aLf" stroke="var(--skin)" stroke-width="10"/>' +
            '  <line id="aRs" stroke="var(--rescuer)" stroke-width="15"/><line id="aRf" stroke="var(--skin)" stroke-width="10"/>' +
            ' </g>' +
            '</g>' +
            '<g id="patient">' +
            ' <path d="M370,362 L370,318 Q380,320 420,326 L488,336 L584,344 L584,362 Z" fill="var(--pants)"/>' +
            ' <rect x="580" y="324" width="28" height="38" rx="10" fill="var(--shoe)"/>' +
            ' <rect x="204" y="326" width="30" height="36" fill="var(--skin)"/>' +
            ' <path id="torso" d="" fill="var(--pshirt)"/>' +
            ' <rect x="232" y="332" width="72" height="22" rx="11" fill="var(--pshirt2)"/>' +
            ' <rect x="298" y="336" width="98" height="14" rx="7" fill="var(--skin)"/>' +
            ' <ellipse cx="408" cy="344" rx="14" ry="7" fill="var(--skin)"/>' +
            ' <g id="head">' +
            '  <ellipse cx="172" cy="340" rx="31" ry="27" fill="var(--hair)"/>' +
            '  <ellipse cx="180" cy="336" rx="30" ry="26" fill="var(--skin)"/>' +
            '  <path d="M162,318 q6,4 12,0" stroke="var(--fg)" stroke-width="2" fill="none" stroke-linecap="round"/>' +
            '  <path d="M180,311 q6,-10 12,0" stroke="var(--skin2)" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
            '  <path d="M196,320 q6,2 9,8" stroke="var(--skin2)" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
            ' </g>' +
            '</g>' +
            '<g id="rFront">' +
            ' <g id="phone"><rect x="-6" y="-14" width="12" height="26" rx="3" fill="var(--fg)"/></g>' +
            ' <ellipse id="hT" rx="10" ry="8" fill="var(--skin)" stroke="var(--skin2)" stroke-width="1.5"/>' +
            ' <ellipse id="hP" rx="10" ry="8" fill="var(--skin)" stroke="var(--skin2)" stroke-width="1.5"/>' +
            ' <g id="hnd">' +
            '  <rect x="-20" y="-9" width="40" height="18" rx="8" fill="var(--skin)" stroke="var(--skin2)" stroke-width="1.5"/>' +
            '  <path d="M-11,-2 v7 M-4,-2 v8 M3,-2 v8 M10,-2 v7" stroke="var(--skin2)" stroke-width="1.5" stroke-linecap="round" fill="none"/>' +
            ' </g>' +
            '</g>' +
            '<ellipse id="target" cx="272" cy="307" rx="30" ry="8" fill="none" stroke="var(--red)" stroke-width="3" stroke-dasharray="6 5"/>' +
            '<text id="lab" x="346" y="232" font-size="13" fill="var(--muted)"></text>' +
            '<g id="aed">' +
            ' <rect x="236" y="309" width="16" height="6" rx="2" fill="var(--card)" stroke="var(--green)" stroke-width="2"/>' +
            ' <rect x="298" y="311" width="24" height="6" rx="2" fill="var(--card)" stroke="var(--green)" stroke-width="2"/>' +
            ' <path d="M244,315 C244,356 450,356 520,306" fill="none" stroke="var(--green)" stroke-width="2.5"/>' +
            ' <path d="M322,314 Q420,300 520,288" fill="none" stroke="var(--green)" stroke-width="2.5"/>' +
            ' <rect x="516" y="252" width="92" height="70" rx="9" fill="var(--card)" stroke="var(--green)" stroke-width="3"/>' +
            ' <text x="562" y="284" text-anchor="middle" font-size="20" font-weight="700" fill="var(--green)">AED</text>' +
            ' <circle id="led" cx="562" cy="305" r="6" fill="var(--green)"/>' +
            '</g>' +
            '<g id="brs">' +
            ' <line x1="160" y1="244" x2="84" y2="150" stroke="var(--rescuer)" stroke-width="54" stroke-linecap="round"/>' +
            ' <circle cx="176" cy="266" r="26" fill="var(--skin)"/>' +
            ' <path d="M152,262 Q148,236 176,240 Q196,242 200,254 Q180,248 152,262 Z" fill="var(--hair)"/>' +
            ' <path d="M200,266 l8,6 l-8,4" fill="none" stroke="var(--skin2)" stroke-width="2.5" stroke-linejoin="round"/>' +
            ' <ellipse cx="150" cy="311" rx="16" ry="7" fill="var(--skin)" stroke="var(--skin2)" stroke-width="1.5"/>' +
            ' <ellipse cx="214" cy="341" rx="12" ry="7" fill="var(--skin)" stroke="var(--skin2)" stroke-width="1.5"/>' +
            ' <circle id="p1" cx="198" cy="292" r="5" fill="none" stroke="var(--rescuer)" stroke-width="3"/>' +
            ' <text x="246" y="236" font-size="13" fill="var(--muted)">Tilt head, lift chin, seal the mouth</text>' +
            '</g>' +
            '<g id="inset" transform="translate(560,20)">' +
            ' <rect width="210" height="200" rx="12" fill="var(--card)" stroke="var(--line)" stroke-width="2"/>' +
            ' <path d="M48,150 L48,60 Q48,38 76,34 L134,34 Q162,38 162,60 L162,150 Z" fill="var(--skin)" opacity=".85"/>' +
            ' <path d="M70,46 Q105,56 140,46" stroke="var(--skin2)" stroke-width="2" fill="none"/>' +
            ' <rect x="98" y="50" width="14" height="62" rx="7" fill="none" stroke="var(--fg)" stroke-width="1.5" opacity=".5"/>' +
            ' <line x1="60" y1="84" x2="150" y2="84" stroke="var(--muted)" stroke-dasharray="4 3"/>' +
            ' <circle cx="74" cy="84" r="3" fill="var(--skin2)"/><circle cx="136" cy="84" r="3" fill="var(--skin2)"/>' +
            ' <ellipse cx="105" cy="96" rx="22" ry="13" fill="var(--red)" fill-opacity=".28" stroke="var(--red)" stroke-width="3"/>' +
            ' <text x="105" y="172" text-anchor="middle" font-size="12" fill="var(--fg)">Centre of the chest,</text>' +
            ' <text x="105" y="189" text-anchor="middle" font-size="12" fill="var(--fg)">lower half of the breastbone</text>' +
            '</g>' +
            '<g id="gauge">' +
            ' <text x="722" y="140" text-anchor="middle" font-size="12" fill="var(--muted)">Depth</text>' +
            ' <rect x="716" y="150" width="12" height="154" rx="6" fill="var(--line)"/>' +
            ' <rect x="711" y="260" width="22" height="22" fill="var(--green)" opacity=".35"/>' +
            ' <rect id="gf" x="716" y="150" width="12" height="0" rx="6" fill="var(--red)"/>' +
            ' <text x="706" y="276" text-anchor="end" font-size="12" fill="var(--green)">5–6 cm</text>' +
            ' <text id="ph" x="722" y="122" text-anchor="middle" font-size="14" font-weight="700" fill="var(--red)"></text>' +
            '</g>' +
            '<g id="bubble">' +
            ' <rect x="250" y="26" width="300" height="44" rx="12" fill="var(--card)" stroke="var(--line)" stroke-width="2"/>' +
            ' <text id="bubT" x="400" y="55" text-anchor="middle" font-size="19" font-weight="600" fill="var(--fg)"></text>' +
            '</g>' +
            '</svg>' +
            '<div class="hud"><b id="cnt">0</b><span id="cntL"></span></div>' +
            '</div>' +
            '<div class="info" aria-live="polite"><h2 id="ttl"></h2><p id="txt"></p></div>' +
            '<div class="bar">' +
            '<button id="play" class="main" type="button">Play</button>' +
            '<button id="rst" type="button">Restart</button>' +
            '<div class="track" id="trk" role="slider" aria-label="Timeline" aria-valuemin="0" aria-valuemax="60" aria-valuenow="0" tabindex="0"><i></i><u id="fill"></u></div>' +
            '<span class="time" id="tm">0:00</span>' +
            '<button id="snd" type="button" aria-pressed="true">Beat: on</button>' +
            '</div>' +
            '<p class="note">Educational overview for adults. Real CPR skills come from hands-on training: take a certified course (Red Cross, AHA or your local equivalent). Emergency numbers vary by country.</p>' +
        '</div></div>';

    let cprRAF = 0;

    function renderCPR() { return CPR_HTML; }

    function initCPR() {
        const root = document.querySelector('.g-cpr');
        if (!root) return;
        if (cprRAF) { cancelAnimationFrame(cprRAF); cprRAF = 0; }

        var SC = [
            [0, 6, "1. Check the scene", "Make sure it’s safe. Kneel beside them, tap their shoulders firmly and shout, “Are you OK?” If they don’t respond and aren’t breathing normally (only gasping), start CPR.", "Are you OK?"],
            [6, 12, "2. Call for help", "Call your local emergency number, or point at someone and tell them to call. Ask another person to fetch an AED. Use speaker so your hands stay free.", "Call emergency services!"],
            [12, 17, "3. Place your hands", "Kneel beside their chest. Put the heel of one hand on the centre of the chest, on the lower half of the breastbone (between the nipples). Put the other hand on top and lace your fingers, keeping them off the ribs.", ""],
            [17, 33.4, "4. Push hard, push fast", "Lock your elbows with your shoulders directly above your hands. Push straight down 5–6 cm (2 inches), 100–120 times a minute, to the beat. Let the chest rise fully between pushes. Count 30.", ""],
            [33.4, 40, "5. Rescue breaths (optional)", "If you’re trained: tilt the head back, lift the chin, pinch the nose and give 2 breaths of 1 second each, watching the chest rise. Not trained? Skip breaths and keep pushing (hands-only CPR).", ""],
            [40, 54, "Back to compressions", "Return to 30 pushes, then 2 breaths if trained. Swap with someone else every 2 minutes if you can, since pushing is tiring.", ""],
            [54, 60.01, "6. Use an AED", "As soon as an AED arrives, turn it on and follow its voice prompts. Keep pushing until it says to stop. Don’t stop until help takes over or the person starts to breathe normally.", "Follow the AED voice"]
        ];
        var BL = [[17, 33.4], [40, 60.01]], PER = 60 / 110, T = 60, MAXD = 14.3, PXCM = 22, ARM = 135, CX = 272;
        var $ = function (i) { return root.querySelector('#' + i); };
        var t = 0, playing = false, last = 0, lastBeat = -1, sound = true, ac = null;
        function cl(x) { return Math.max(0, Math.min(1, x)); }
        function sm(x) { x = cl(x); return x * x * (3 - 2 * x); }
        function tick() {
            try {
                if (!sound) return; ac = ac || new (window.AudioContext || window.webkitAudioContext)();
                var o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ac.destination);
                g.gain.setValueAtTime(.12, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .08); o.start(); o.stop(ac.currentTime + .09);
            } catch (e) {}
        }
        function ln(id, a, b, c, d) { var e = $(id); e.setAttribute("x1", a); e.setAttribute("y1", b); e.setAttribute("x2", c); e.setAttribute("y2", d); }
        // two-segment arm of fixed length: straight when stretched, elbow bends outward when hand is closer
        function arm(p, sx, sy, hx, hy, out) {
            var dx = hx - sx, dy = hy - sy, D = Math.hypot(dx, dy) || 1, h = Math.sqrt(Math.max(0, ARM * ARM / 4 - D * D / 4));
            var nx = -dy / D, ny = dx / D; if (nx * out < 0) { nx = -nx; ny = -ny; }
            var ex = (sx + hx) / 2 + nx * h, ey = (sy + hy) / 2 + ny * h;
            ln(p + "s", sx, sy, ex, ey); ln(p + "f", ex, ey, hx, hy);
        }
        function vis(id, v) { $(id).style.opacity = v ? 1 : 0; }
        function at(id, x, y) { $(id).setAttribute("transform", "translate(" + x + "," + y + ")"); }
        function render() {
            var si = 0; for (var i = 0; i < SC.length; i++) { if (t >= SC[i][0] && t < SC[i][1]) { si = i; break; } }
            var s = SC[si];
            $("ttl").textContent = s[2]; $("txt").textContent = s[3];
            var comp = false, bs = 0;
            for (var b = 0; b < BL.length; b++) { if (t >= BL[b][0] && t < BL[b][1]) { comp = true; bs = BL[b][0]; } }
            var dy = 0, beat = 0, p = 0;
            if (comp) {
                var e = t - bs; p = (e % PER) / PER; dy = MAXD * (.5 - .5 * Math.cos(2 * Math.PI * p)); beat = Math.floor(e / PER) + 1;
                if (beat !== lastBeat) { lastBeat = beat; if (playing) tick(); }
            } else lastBeat = -1;
            var inB = si === 4, rise = 0, q = t - 33.4;
            if (inB) { [[1, 2], [3.6, 4.6]].forEach(function (w) { if (q > w[0] && q < w[1]) rise = -8 * Math.sin(Math.PI * (q - w[0])); }); }
            var d = comp ? dy : rise;
            $("torso").setAttribute("d", "M222,362 L222,326 Q224,314 240,310 Q272," + (300 + 2 * d) + " 304,310 L346,316 Q386,318 394,330 L394,362 Z");
            var tilt = inB ? 12 * Math.min(1, q / .6, (40 - t) / .5) : 0;
            $("head").setAttribute("transform", "rotate(" + (-tilt) + " 218 336)");
            // rescuer position and arms
            var off = t < 10.4 ? -60 : (t < 11.4 ? -60 * (1 - sm(t - 10.4)) : 0);
            var sL = CX - 42 + off, sR = CX + 42 + off, sy = 166 + dy;
            at("rb", off, dy);
            var Lx, Ly, Rx, Ry, hy = 296 + dy;
            if (t < 12) {
                var W = t < 11.2 ? 0 : sm((t - 11.2) / .8);
                if (si === 0) { Lx = sL - 6; Ly = 345; Rx = sR - 10; Ry = 310 - 14 * Math.abs(Math.sin(t * 6)); }
                else { Lx = sL + 22; Ly = 110; Rx = sR + 6; Ry = 345; }
                Lx += (CX - 6 - Lx) * W; Ly += (262 - Ly) * W; Rx += (CX + 6 - Rx) * W; Ry += (262 - Ry) * W;
            } else {
                if (si === 2) hy = 262 + 34 * sm((t - 12) / 2);
                Lx = CX - 6; Rx = CX + 6; Ly = Ry = hy;
            }
            arm("aL", sL, sy, Lx, Ly, -1); arm("aR", sR, sy, Rx, Ry, 1);
            vis("rBack", !inB); vis("rFront", !inB); vis("brs", inB);
            vis("hT", si === 0); at("hT", Rx, Ry);
            var ph = (si === 1 && t < 11.2); vis("hP", ph); at("hP", Lx, Ly); vis("phone", ph);
            $("phone").setAttribute("transform", "translate(" + (Lx + 1) + "," + (Ly - 6) + ") rotate(-14)");
            vis("hnd", t >= 12 && !inB); at("hnd", CX, hy);
            vis("target", si === 2); $("target").setAttribute("opacity", .55 + .45 * Math.sin(t * 5));
            vis("inset", si === 2);
            var lab = $("lab");
            if (si === 2) { lab.textContent = "Lower half of the breastbone"; lab.setAttribute("y", 296); lab.setAttribute("x", 318); }
            else { lab.textContent = "Elbows locked, arms straight"; lab.setAttribute("y", 232); lab.setAttribute("x", 346); }
            vis("lab", si === 2 || comp);
            vis("aed", si === 6); $("led").style.opacity = (Math.floor(t * 2) % 2) ? 1 : .25;
            vis("gauge", comp);
            var cm = dy / MAXD * 5.5;
            $("gf").setAttribute("height", Math.max(0, cm * PXCM));
            $("ph").textContent = comp ? (p < .5 ? "Push" : "Release") : "";
            var bt = s[4]; vis("bubble", !!bt); $("bubT").textContent = bt;
            if (comp) { $("cnt").textContent = beat; $("cntL").textContent = "pushes · 110/min · " + cm.toFixed(1) + " cm"; }
            else if (inB) { $("cnt").textContent = "2"; $("cntL").textContent = "slow breaths"; }
            else { $("cnt").textContent = ""; $("cntL").textContent = ""; }
            if (inB) {
                var pf = 0; [[1, 2], [3.6, 4.6]].forEach(function (w) { if (q > w[0] && q < w[1]) pf = q - w[0]; });
                $("p1").style.opacity = pf > 0 ? 1 - pf : 0; $("p1").setAttribute("cy", 292 + pf * 16); $("p1").setAttribute("r", 5 + pf * 10);
            }
            $("fill").style.width = (Math.min(t / T, 1) * 100) + "%";
            var m = Math.min(Math.floor(t), 60); $("tm").textContent = "0:" + (m < 10 ? "0" : "") + m;
            $("trk").setAttribute("aria-valuenow", m);
        }
        function loop(now) {
            if (!root.isConnected) { cprRAF = 0; return; }   // guide closed → stop the loop
            if (playing) { var dt = (now - last) / 1000; last = now; t += dt; if (t >= T) { t = T - .001; playing = false; $("play").textContent = "Replay"; } }
            render(); cprRAF = requestAnimationFrame(loop);
        }
        cprRAF = requestAnimationFrame(function (n) { last = n; loop(n); });
        $("play").onclick = function () {
            if (t >= T - .01) t = 0;
            playing = !playing; last = performance.now();
            $("play").textContent = playing ? "Pause" : "Play";
            try { if (playing && sound && !ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac && ac.state === "suspended") ac.resume(); } catch (e) {}
        };
        $("rst").onclick = function () { t = 0; lastBeat = -1; playing = true; last = performance.now(); $("play").textContent = "Pause"; };
        $("snd").onclick = function () { sound = !sound; this.textContent = "Beat: " + (sound ? "on" : "off"); this.setAttribute("aria-pressed", sound); };
        $("trk").onclick = function (e) { var r = this.getBoundingClientRect(); t = Math.max(0, Math.min(T - .01, (e.clientX - r.left) / r.width * T)); lastBeat = -1; };
        $("trk").onkeydown = function (e) { if (e.key === "ArrowRight") t = Math.min(T - .01, t + 3); if (e.key === "ArrowLeft") t = Math.max(0, t - 3); };
        SC.forEach(function (s) { if (s[0] > 0) { var m = document.createElement("s"); m.style.left = (s[0] / T * 100) + "%"; $("trk").appendChild(m); } });
        render();
    }

    // ------------------------------------------------------------
    // Bleeding 60-second walkthrough (First Aid → Bleeding tab)
    // Scoped port of the standalone "bleeding in 60 seconds" animation. Its CSS
    // lives in dashboard.html (every rule gated behind .g-bleed); the markup is
    // injected below and initBleed() wires it up right after the guide renders.
    // ------------------------------------------------------------
    const BLEED_HTML =
        '<div class="g-bleed"><div class="cpr-main">' +
            '<h1>First aid: bleeding (60-second walkthrough)</h1>' +
            '<div class="stage">' +
            '<svg viewBox="0 0 800 440" role="img" aria-label="Top-down animation of a rescuer controlling forearm bleeding with direct pressure, elevation and a tourniquet">' +
            '<rect width="800" height="440" fill="var(--ground)"/>' +
            '<path d="M700,0 L800,0 L800,130 L752,96 L736,40 Z" fill="var(--rubble)"/>' +
            '<path d="M0,340 L60,322 L96,350 L84,388 L20,400 L0,396 Z" fill="var(--rubble)"/>' +
            '<rect x="560" y="300" width="190" height="24" rx="3" fill="var(--wood)" transform="rotate(-24 655 312)"/>' +
            '<path d="M0,430 L90,402 L130,416 L210,396 M520,440 L560,420 L610,432 L680,410 M130,10 L170,52 L160,92" stroke="var(--rubble)" stroke-width="2" fill="none" opacity=".6"/>' +
            '<g fill="#b5654a" opacity=".85"><rect x="610" y="392" width="22" height="11" rx="2" transform="rotate(12 621 397)"/><rect x="640" y="404" width="20" height="10" rx="2"/><rect x="600" y="240" width="22" height="11" rx="2" transform="rotate(-18 611 245)"/><rect x="40" y="250" width="20" height="10" rx="2"/></g>' +
            '<g id="patient">' +
            ' <rect x="325" y="158" width="172" height="30" rx="14" fill="var(--pants)"/>' +
            ' <rect x="325" y="192" width="172" height="30" rx="14" fill="var(--pants)"/>' +
            ' <rect x="486" y="156" width="26" height="34" rx="12" fill="var(--shoe)"/>' +
            ' <rect x="486" y="190" width="26" height="34" rx="12" fill="var(--shoe)"/>' +
            ' <rect x="186" y="179" width="22" height="22" fill="var(--skin)"/>' +
            ' <path id="torso" d="M205,152 Q208,144 224,145 L262,150 L300,158 Q320,156 332,158 L332,222 Q320,224 300,222 L262,230 L224,235 Q208,236 205,228 Z" fill="var(--pshirt)"/>' +
            ' <g stroke-linecap="round">' +
            '  <line x1="214" y1="152" x2="278.4" y2="133.5" stroke="var(--skin)" stroke-width="20"/>' +
            '  <line x1="278.4" y1="133.5" x2="331.3" y2="118.3" stroke="var(--skin)" stroke-width="16"/>' +
            '  <line x1="214" y1="152" x2="249.4" y2="141.8" stroke="var(--pshirt2)" stroke-width="26"/>' +
            ' </g>' +
            ' <ellipse cx="352" cy="112" rx="19" ry="9" fill="var(--skin)" transform="rotate(-16 352 112)"/>' +
            ' <ellipse cx="160" cy="190" rx="26" ry="19" fill="var(--hair)"/>' +
            ' <ellipse cx="166" cy="190" rx="24" ry="17" fill="var(--skin)"/>' +
            ' <path d="M156,182 q4,3 8,0 M156,198 q4,-3 8,0 M168,186 L175,190 L168,194 M181,186 q3,4 0,8" stroke="var(--skin2)" stroke-width="2" fill="none" stroke-linecap="round"/>' +
            '</g>' +
            '<ellipse id="pool" cx="307" cy="262" rx="0" ry="0" fill="var(--blood)" opacity=".85"/>' +
            '<g id="armB" stroke-linecap="round">' +
            ' <line x1="214" y1="228" x2="278.4" y2="246.5" stroke="var(--skin)" stroke-width="20"/>' +
            ' <line x1="278.4" y1="246.5" x2="331.3" y2="261.7" stroke="var(--skin)" stroke-width="16"/>' +
            ' <line x1="214" y1="228" x2="249.4" y2="238.2" stroke="var(--pshirt2)" stroke-width="26"/>' +
            ' <ellipse cx="352" cy="268" rx="19" ry="9" fill="var(--skin)" stroke="none" transform="rotate(16 352 268)"/>' +
            ' <line x1="298" y1="253" x2="318" y2="259" stroke="var(--blood)" stroke-width="6" opacity=".9"/>' +
            '</g>' +
            '<g id="wound" transform="translate(307,255) rotate(16)"><path d="M-10,-2 L-4,3 L2,-3 L9,2" stroke="var(--blood)" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>' +
            '<clipPath id="bc"><rect id="bcr" x="214" y="136" width="0" height="108"/></clipPath>' +
            '<g clip-path="url(#bc)">' +
            ' <rect x="214" y="142" width="300" height="96" rx="12" fill="var(--blanket)" opacity=".93"/>' +
            ' <path d="M240,150 L262,170 L240,196 L268,226 M330,146 L350,186 L324,228 M420,150 L440,188 L412,230" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none"/>' +
            '</g>' +
            '<g id="pad" transform="translate(307,255) rotate(16)"><rect x="-17" y="-14" width="34" height="28" rx="3" fill="var(--gauze)" stroke="var(--line)"/><ellipse id="st1" rx="12" ry="9" fill="var(--blood)" opacity="0"/></g>' +
            '<g id="pad2" transform="translate(309,254) rotate(10)"><rect x="-16" y="-13" width="32" height="26" rx="3" fill="var(--gauze)" stroke="var(--line)"/><ellipse id="st2" rx="9" ry="7" fill="var(--blood)" opacity="0"/></g>' +
            '<g id="band" transform="translate(264,242) rotate(16)">' +
            ' <rect x="-6" y="-19" width="12" height="38" rx="3" fill="var(--band)"/>' +
            ' <g id="rod"><line x1="-16" y1="0" x2="16" y2="0" stroke="var(--amb)" stroke-width="5" stroke-linecap="round"/></g>' +
            '</g>' +
            '<g id="tag"><line x1="272" y1="231" x2="282" y2="222" stroke="var(--fg)" stroke-width="1"/><g transform="translate(288,216) rotate(-8)"><rect x="-14" y="-9" width="28" height="18" rx="2" fill="var(--gauze)" stroke="var(--line)"/><path d="M-9,-2 h18 M-9,3 h11" stroke="#1d1b1a" stroke-width="1.5"/></g></g>' +
            '<g id="rsc">' +
            ' <rect x="252" y="352" width="96" height="100" rx="28" fill="var(--rescuer)"/>' +
            ' <g id="rh"><circle cx="283" cy="356" r="4" fill="var(--skin)"/><circle cx="317" cy="356" r="4" fill="var(--skin)"/><circle cx="300" cy="354" r="17" fill="var(--hair)"/><path d="M295,339 L300,329 L305,339 Z" fill="var(--skin)"/></g>' +
            '</g>' +
            '<g stroke-linecap="round">' +
            ' <line id="aLs" stroke="var(--rescuer)" stroke-width="15"/><line id="aLf" stroke="var(--skin)" stroke-width="9"/>' +
            ' <line id="aRs" stroke="var(--rescuer)" stroke-width="15"/><line id="aRf" stroke="var(--skin)" stroke-width="9"/>' +
            '</g>' +
            '<g id="phone"><rect x="-5" y="-12" width="10" height="22" rx="3" fill="var(--fg)"/></g>' +
            '<ellipse id="hL" rx="11" ry="8" stroke="var(--skin2)" stroke-width="1.5"/>' +
            '<ellipse id="hR" rx="11" ry="8" stroke="var(--skin2)" stroke-width="1.5"/>' +
            '<g id="sp" fill="var(--blood)"><circle id="s0" r="3.5"/><circle id="s1" r="3"/><circle id="s2" r="3.5"/></g>' +
            '<g id="inset" transform="translate(560,20)"><rect width="220" height="190" rx="12" fill="var(--card)" stroke="var(--line)" stroke-width="2"/>' +
            '<line x1="14" y1="152" x2="206" y2="152" stroke="var(--line)" stroke-width="3"/>' +
            '<circle cx="34" cy="140" r="10" fill="var(--skin)"/><rect x="42" y="132" width="130" height="20" rx="8" fill="var(--pshirt)"/>' +
            '<line x1="86" y1="134" x2="104" y2="76" stroke="var(--skin)" stroke-width="10" stroke-linecap="round"/><ellipse cx="106" cy="66" rx="7" ry="11" fill="var(--skin)"/>' +
            '<line x1="60" y1="130" x2="170" y2="130" stroke="var(--muted)" stroke-dasharray="4 3"/><text x="176" y="128" font-size="10.5" fill="var(--muted)">heart</text>' +
            '<path d="M130,128 V84" stroke="var(--green)" stroke-width="2" stroke-dasharray="3 3"/>' +
            '<text x="110" y="28" text-anchor="middle" font-size="13" font-weight="700" fill="var(--fg)">Raise the limb above the heart</text>' +
            '<text x="110" y="172" text-anchor="middle" font-size="11.5" fill="var(--muted)">Only if no fracture is suspected</text></g>' +
            '<text id="lab" x="366" y="300" font-size="13" font-weight="600" fill="var(--fg)"></text>' +
            '<g id="bubble"><rect x="250" y="16" width="300" height="44" rx="12" fill="var(--card)" stroke="var(--line)" stroke-width="2"/><text id="bubT" x="400" y="45" text-anchor="middle" font-size="19" font-weight="600" fill="var(--fg)"></text></g>' +
            '</svg>' +
            '<div class="hud"><b id="hb"></b><span id="hl"></span></div>' +
            '</div>' +
            '<div class="info" aria-live="polite"><h2 id="ttl"></h2><p id="txt"></p></div>' +
            '<div class="bar"><button id="play" class="main" type="button">Play</button><button id="rst" type="button">Restart</button>' +
            '<div class="track" id="trk" role="slider" aria-label="Timeline" aria-valuemin="0" aria-valuemax="60" aria-valuenow="0" tabindex="0"><i></i><u id="fill"></u></div><span class="time" id="tm">0:00</span></div>' +
            '<p class="note">Educational overview, not a substitute for training. Take a certified first aid course. Always call 911 first in an emergency, then begin care. Steps follow the First Aid guide in your app.</p>' +
        '</div></div>';

    let bleedRAF = 0;

    function renderBleed() { return BLEED_HTML; }

    function initBleed() {
        const root = document.querySelector('.g-bleed');
        if (!root) return;
        if (bleedRAF) { cancelAnimationFrame(bleedRAF); bleedRAF = 0; }

        var SC = [
            [0, 6, "Call 911 first", "Always call 911 first, then begin care. Put on gloves if you have them. This person is bleeding from the forearm.", ""],
            [6, 19, "1. Direct pressure", "Cover the wound with a clean cloth and press hard with the heel of your hand for 10 minutes, without peeking.", ""],
            [19, 26, "2. Add more cloth", "If blood soaks through, add more cloth on top. Do not remove the first layer.", ""],
            [26, 34, "3. Elevate the limb", "Raise the injured limb above the heart, if no fracture is suspected.", ""],
            [34, 47, "Severe or spurting: tourniquet", "If blood is spurting or won’t stop, apply a tourniquet 5 cm above the wound (never on a joint). Tighten until the bleeding stops, then note the time written on the skin.", ""],
            [47, 60.01, "Do not loosen it", "Do not loosen the tourniquet once it is applied. That is a job for EMS.", ""]
        ];
        var T = 60, t = 0, playing = false, last = 0, R = function () {};
        var $ = function (i) { return root.querySelector('#' + i); };
        function cl(x) { return Math.max(0, Math.min(1, x)); }
        function sm(x) { x = cl(x); return x * x * (3 - 2 * x); }
        function vis(id, v) { $(id).style.opacity = v; }
        function at(id, x, y) { $(id).setAttribute("transform", "translate(" + x + "," + y + ")"); }
        function hud(b, l, c) { var e = $("hb"); e.textContent = b; e.style.color = c || "var(--fg)"; $("hl").textContent = l || ""; }
        function bub(s) { vis("bubble", s ? 1 : 0); $("bubT").textContent = s || ""; }
        function lab(s, x, y) { var e = $("lab"); e.textContent = s || ""; e.setAttribute("x", x || 366); e.setAttribute("y", y || 300); }
        function ln(id, a, b, c, d) { var e = $(id); e.setAttribute("x1", a); e.setAttribute("y1", b); e.setAttribute("x2", c); e.setAttribute("y2", d); }
        function arm(p, sx, sy, hx, hy, out, L) { L = L || 125; var dx = hx - sx, dy = hy - sy, D = Math.hypot(dx, dy) || 1, h = Math.min(36, Math.sqrt(Math.max(0, L * L / 4 - D * D / 4))); var nx = -dy / D, ny = dx / D; if (nx * out < 0) { nx = -nx; ny = -ny; } var ex = (sx + hx) / 2 + nx * h, ey = (sy + hy) / 2 + ny * h; ln(p + "s", sx, sy, ex, ey); ln(p + "f", ex, ey, hx, hy); }
        var C = 300;
        function rest(ox, oy) { return [C + ox - 30, 396 + oy, C + ox + 30, 396 + oy]; }
        function pose(PS, t) {
            var k = 0; for (var i = 0; i < PS.length; i++) { if (t >= PS[i][0]) k = i; }
            for (var j = 1; j < PS.length; j++) { if (Math.abs(t - PS[j][0]) < .6) { var w = sm((t - (PS[j][0] - .6)) / 1.2), a = PS[j - 1][1](t), b = PS[j][1](t); return a.map(function (v, n) { return v + (b[n] - v) * w; }); } }
            return PS[k][1](t);
        }
        function resc(P, gl, ph) {
            var ox = P[0], oy = P[1], sy = 362 + oy; at("rsc", ox, oy);
            arm("aL", C + ox - 44, sy, P[2], P[3], -1); arm("aR", C + ox + 44, sy, P[4], P[5], 1);
            var f = gl ? "var(--glove)" : "var(--skin)"; $("hL").style.fill = f; $("hR").style.fill = f; at("hL", P[2], P[3]); at("hR", P[4], P[5]);
            vis("phone", ph ? 1 : 0); $("phone").setAttribute("transform", "translate(" + (P[4] + 3) + "," + (P[5] - 4) + ") rotate(10)");
        }
        var PS = [[0, function () { var r = rest(-70, 0); return [-70, 0, r[0], r[1], 256, 346]; }], [6, function () { return [7, 0, 302, 256, 312, 256]; }], [34, function () { return [-36, 0, 255, 262, 273, 262]; }]];
        R = function (t, si) {
            resc(pose(PS, t), t >= 3, t < 5.4);
            var tt = Math.min(t, 41), r = 6 + 9 * sm(Math.min(t, 8) / 8) + 5 * sm((Math.min(t, 30) - 8) / 16) + 7 * sm((tt - 30) / 8);
            var pl = $("pool"); pl.setAttribute("rx", r * 1.3); pl.setAttribute("ry", r);
            vis("wound", t < 6.5 ? 1 : 0); vis("pad", sm((t - 6.4) / .5)); vis("pad2", t >= 19 ? sm((t - 19) / .5) : 0);
            vis("st1", .9 * sm((tt - 7) / 8)); vis("st2", .6 * sm((tt - 20) / 20));
            vis("band", sm((t - 34.3) / .6)); $("rod").setAttribute("transform", "rotate(" + (1080 * sm((t - 36) / 5)) + ")"); vis("tag", sm((t - 42) / .6));
            $("bcr").setAttribute("width", 0); vis("inset", si === 3 ? 1 : 0);
            vis("sp", t >= 30 && t < 39.5 ? 1 : 0);
            for (var i = 0; i < 3; i++) { var p = (t * 2.2 + i / 3) % 1, e = $("s" + i); e.setAttribute("cx", 307 + (i - 1) * 9 + p * 16); e.setAttribute("cy", 250 - p * 34 + p * p * 46); e.style.opacity = 1 - p; }
            var l = "", x = t < 34 ? 366 : 330;
            if (t >= 6.5 && t < 19) l = "Press hard, don’t lift to check"; else if (t >= 19 && t < 26) l = "More cloth on top, keep the first layer";
            else if (t >= 34.3 && t < 42) l = "5 cm above the wound, not on a joint"; else if (t >= 42 && t < 47) l = "Note the time on the skin";
            else if (t >= 47) l = "Don’t loosen it. Leave it to EMS.";
            lab(l, x, 300); bub(t < 5.4 ? "Call 911!" : "");
            if (t < 6) hud("Heavy", "Bleeding", "var(--red)"); else if (t < 30) hud("Slowing", "Bleeding", "var(--amb)"); else if (t < 41) hud("Spurting", "Bleeding", "var(--red)"); else hud("Controlled", "Bleeding", "var(--green)");
        };
        function render() {
            var si = 0; for (var i = 0; i < SC.length; i++) { if (t >= SC[i][0] && t < SC[i][1]) { si = i; break; } }
            $("ttl").textContent = SC[si][2]; $("txt").textContent = SC[si][3];
            R(t, si);
            $("fill").style.width = (Math.min(t / T, 1) * 100) + "%";
            var m = Math.min(Math.floor(t), 60); $("tm").textContent = "0:" + (m < 10 ? "0" : "") + m; $("trk").setAttribute("aria-valuenow", m);
        }
        function loop(now) {
            if (!root.isConnected) { bleedRAF = 0; return; }   // guide closed → stop the loop
            if (playing) { t += (now - last) / 1000; last = now; if (t >= T) { t = T - .001; playing = false; $("play").textContent = "Replay"; } }
            render(); bleedRAF = requestAnimationFrame(loop);
        }
        bleedRAF = requestAnimationFrame(function (n) { last = n; loop(n); });
        $("play").onclick = function () { if (t >= T - .01) t = 0; playing = !playing; last = performance.now(); $("play").textContent = playing ? "Pause" : "Play"; };
        $("rst").onclick = function () { t = 0; playing = true; last = performance.now(); $("play").textContent = "Pause"; };
        $("trk").onclick = function (e) { var r = this.getBoundingClientRect(); t = Math.max(0, Math.min(T - .01, (e.clientX - r.left) / r.width * T)); };
        $("trk").onkeydown = function (e) { if (e.key === "ArrowRight") t = Math.min(T - .01, t + 3); if (e.key === "ArrowLeft") t = Math.max(0, t - 3); };
        SC.forEach(function (s) { if (s[0] > 0) { var m = document.createElement("s"); m.style.left = (s[0] / T * 100) + "%"; $("trk").appendChild(m); } });
        render();
    }

    // ------------------------------------------------------------
    // Fractures 60-second walkthrough (First Aid → Fractures tab)
    // Scoped port of the standalone "fractures in 60 seconds" animation. Its CSS
    // lives in dashboard.html (every rule gated behind .g-frac); the markup is
    // injected below and initFrac() wires it up right after the guide renders.
    // ------------------------------------------------------------
    const FRAC_HTML =
        '<div class="g-frac"><div class="cpr-main">' +
            '<h1>First aid: fractures (60-second walkthrough)</h1>' +
            '<div class="stage">' +
            '<svg viewBox="0 0 800 440" role="img" aria-label="Top-down animation of splinting a broken forearm, applying a cold pack, covering an open fracture and keeping a suspected spine injury still">' +
            '<rect width="800" height="440" fill="var(--ground)"/>' +
            '<path d="M700,0 L800,0 L800,130 L752,96 L736,40 Z" fill="var(--rubble)"/>' +
            '<path d="M0,340 L60,322 L96,350 L84,388 L20,400 L0,396 Z" fill="var(--rubble)"/>' +
            '<rect x="560" y="300" width="190" height="24" rx="3" fill="var(--wood)" transform="rotate(-24 655 312)"/>' +
            '<path d="M0,430 L90,402 L130,416 L210,396 M520,440 L560,420 L610,432 L680,410 M130,10 L170,52 L160,92" stroke="var(--rubble)" stroke-width="2" fill="none" opacity=".6"/>' +
            '<g fill="#b5654a" opacity=".85"><rect x="610" y="392" width="22" height="11" rx="2" transform="rotate(12 621 397)"/><rect x="640" y="404" width="20" height="10" rx="2"/><rect x="600" y="240" width="22" height="11" rx="2" transform="rotate(-18 611 245)"/><rect x="40" y="250" width="20" height="10" rx="2"/></g>' +
            '<g id="splint"><g transform="translate(314,268) rotate(26)"><rect x="-56" y="-10" width="112" height="20" rx="4" fill="var(--wood)"/><rect x="-52" y="-7" width="104" height="14" rx="3" fill="var(--gauze)"/></g></g>' +
            '<g id="patient">' +
            ' <rect x="325" y="158" width="172" height="30" rx="14" fill="var(--pants)"/>' +
            ' <rect x="325" y="192" width="172" height="30" rx="14" fill="var(--pants)"/>' +
            ' <rect x="486" y="156" width="26" height="34" rx="12" fill="var(--shoe)"/>' +
            ' <rect x="486" y="190" width="26" height="34" rx="12" fill="var(--shoe)"/>' +
            ' <rect x="186" y="179" width="22" height="22" fill="var(--skin)"/>' +
            ' <path id="torso" d="M205,152 Q208,144 224,145 L262,150 L300,158 Q320,156 332,158 L332,222 Q320,224 300,222 L262,230 L224,235 Q208,236 205,228 Z" fill="var(--pshirt)"/>' +
            ' <g stroke-linecap="round">' +
            '  <line x1="214" y1="152" x2="278.4" y2="133.5" stroke="var(--skin)" stroke-width="20"/>' +
            '  <line x1="278.4" y1="133.5" x2="331.3" y2="118.3" stroke="var(--skin)" stroke-width="16"/>' +
            '  <line x1="214" y1="152" x2="249.4" y2="141.8" stroke="var(--pshirt2)" stroke-width="26"/>' +
            ' </g>' +
            ' <ellipse cx="352" cy="112" rx="19" ry="9" fill="var(--skin)" transform="rotate(-16 352 112)"/>' +
            ' <ellipse cx="160" cy="190" rx="26" ry="19" fill="var(--hair)"/>' +
            ' <ellipse cx="166" cy="190" rx="24" ry="17" fill="var(--skin)"/>' +
            ' <path d="M156,182 q4,3 8,0 M156,198 q4,-3 8,0 M168,186 L175,190 L168,194 M181,186 q3,4 0,8" stroke="var(--skin2)" stroke-width="2" fill="none" stroke-linecap="round"/>' +
            '</g>' +
            '<g id="tw" fill="var(--gauze)" stroke="var(--skin2)"><rect x="142" y="158" width="52" height="10" rx="5"/><rect x="142" y="212" width="52" height="10" rx="5"/></g>' +
            '<g id="armF" stroke-linecap="round"><line x1="214" y1="228" x2="278.4" y2="246.5" stroke="var(--skin)" stroke-width="20"/><line x1="278.4" y1="246.5" x2="305.3" y2="254.2" stroke="var(--skin)" stroke-width="16"/>' +
            '<line x1="305.3" y1="254.2" x2="327.1" y2="270.1" stroke="var(--skin)" stroke-width="16"/><line x1="214" y1="228" x2="249.4" y2="238.2" stroke="var(--pshirt2)" stroke-width="26"/>' +
            '<ellipse cx="344.9" cy="283" rx="19" ry="9" fill="var(--skin)" stroke="none" transform="rotate(36 344.9 283)"/></g>' +
            '<ellipse id="swell" cx="305" cy="254" rx="17" ry="13" fill="var(--bruise)" opacity=".55" transform="rotate(26 305 254)"/>' +
            '<g id="pain" stroke="var(--red)" stroke-width="3" stroke-linecap="round"><line x1="305" y1="222" x2="305" y2="232"/><line x1="332" y1="232" x2="326" y2="240"/><line x1="278" y1="232" x2="284" y2="240"/><line x1="336" y1="262" x2="346" y2="262"/><line x1="270" y1="270" x2="280" y2="266"/></g>' +
            '<rect id="tie1" x="-4" y="-17" width="8" height="34" rx="2" fill="var(--gauze)" stroke="var(--skin2)" transform="translate(290,251) rotate(16)"/>' +
            '<rect id="tie2" x="-4" y="-17" width="8" height="34" rx="2" fill="var(--gauze)" stroke="var(--skin2)" transform="translate(322,268) rotate(36)"/>' +
            '<g id="cold" transform="translate(305,254) rotate(26)"><rect x="-24" y="-15" width="48" height="30" rx="8" fill="#8cc6ea" stroke="#5aa0cc" stroke-width="2"/><rect x="-24" y="-15" width="48" height="30" rx="8" fill="#fff" opacity=".45"/><path d="M-13,-4 h26 M-13,5 h26" stroke="#5aa0cc" stroke-width="2"/></g>' +
            '<g id="xx" transform="translate(372,262)" stroke="var(--red)" stroke-width="5" stroke-linecap="round" fill="none"><circle r="22"/><line x1="-15" y1="-15" x2="15" y2="15"/></g>' +
            '<g id="rsc">' +
            ' <rect x="252" y="352" width="96" height="100" rx="28" fill="var(--rescuer)"/>' +
            ' <g id="rh"><circle cx="283" cy="356" r="4" fill="var(--skin)"/><circle cx="317" cy="356" r="4" fill="var(--skin)"/><circle cx="300" cy="354" r="17" fill="var(--hair)"/><path d="M295,339 L300,329 L305,339 Z" fill="var(--skin)"/></g>' +
            '</g>' +
            '<g stroke-linecap="round">' +
            ' <line id="aLs" stroke="var(--rescuer)" stroke-width="15"/><line id="aLf" stroke="var(--skin)" stroke-width="9"/>' +
            ' <line id="aRs" stroke="var(--rescuer)" stroke-width="15"/><line id="aRf" stroke="var(--skin)" stroke-width="9"/>' +
            '</g>' +
            '<g id="phone"><rect x="-5" y="-12" width="10" height="22" rx="3" fill="var(--fg)"/></g>' +
            '<ellipse id="hL" rx="11" ry="8" stroke="var(--skin2)" stroke-width="1.5"/>' +
            '<ellipse id="hR" rx="11" ry="8" stroke="var(--skin2)" stroke-width="1.5"/>' +
            '<g id="inset" transform="translate(560,20)"><rect width="220" height="190" rx="12" fill="var(--card)" stroke="var(--line)" stroke-width="2"/>' +
            '<text x="110" y="24" text-anchor="middle" font-size="13" font-weight="700" fill="var(--fg)">Open fracture: bone through skin</text>' +
            '<rect x="20" y="104" width="180" height="46" rx="22" fill="var(--skin)"/>' +
            '<path d="M104,108 L112,66 L124,70 L122,110 Z" fill="#f3efe6" stroke="#c9c2b4" stroke-width="2"/><ellipse cx="114" cy="108" rx="18" ry="6" fill="var(--blood)"/>' +
            '<rect id="icl" x="82" y="58" width="64" height="62" rx="10" fill="#9ec9e8" stroke="#6aa6cc" stroke-width="2"/>' +
            '<g id="ihand"><ellipse cx="114" cy="42" rx="20" ry="9" fill="var(--glove)"/><path d="M114,52 v10 M108,58 l6,6 l6,-6" stroke="var(--red)" stroke-width="3" fill="none"/>' +
            '<g id="ix" transform="translate(114,76)" stroke="var(--red)" stroke-width="5" stroke-linecap="round" fill="none"><circle r="24"/><line x1="-17" y1="-17" x2="17" y2="17"/></g></g>' +
            '<text x="110" y="170" text-anchor="middle" font-size="11.5" fill="var(--muted)">Cover with a clean damp cloth.</text><text x="110" y="185" text-anchor="middle" font-size="11.5" fill="var(--muted)">Do NOT push the bone back.</text></g>' +
            '<text id="lab" x="366" y="300" font-size="13" font-weight="600" fill="var(--fg)"></text>' +
            '<g id="bubble"><rect x="250" y="16" width="300" height="44" rx="12" fill="var(--card)" stroke="var(--line)" stroke-width="2"/><text id="bubT" x="400" y="45" text-anchor="middle" font-size="19" font-weight="600" fill="var(--fg)"></text></g>' +
            '</svg>' +
            '<div class="hud"><b id="hb"></b><span id="hl"></span></div>' +
            '</div>' +
            '<div class="info" aria-live="polite"><h2 id="ttl"></h2><p id="txt"></p></div>' +
            '<div class="bar"><button id="play" class="main" type="button">Play</button><button id="rst" type="button">Restart</button>' +
            '<div class="track" id="trk" role="slider" aria-label="Timeline" aria-valuemin="0" aria-valuemax="60" aria-valuenow="0" tabindex="0"><i></i><u id="fill"></u></div><span class="time" id="tm">0:00</span></div>' +
            '<p class="note">Educational overview, not a substitute for training. Take a certified first aid course. Always call 911 first in an emergency, then begin care. Steps follow the First Aid guide in your app.</p>' +
        '</div></div>';

    let fracRAF = 0;

    function renderFrac() { return FRAC_HTML; }

    function initFrac() {
        const root = document.querySelector('.g-frac');
        if (!root) return;
        if (fracRAF) { cancelAnimationFrame(fracRAF); fracRAF = 0; }

        var SC = [
            [0, 8, "Signs of a fracture", "Deformity, swelling, severe pain, refusal to move, a grinding sensation. In an open (compound) fracture the bone pierces the skin, with a high infection risk.", ""],
            [8, 16, "1. Don’t straighten the limb", "Do not try to straighten the limb.", ""],
            [16, 30, "2. Immobilize as-is", "Immobilize it as it lies with a padded splint (a board or rolled magazine) tied above and below the break.", ""],
            [30, 38, "3. Cold pack", "Apply a cold pack wrapped in cloth, 20 minutes on, 20 minutes off.", ""],
            [38, 48, "4. Open fracture", "Cover with a clean damp cloth. Do NOT push the bone back.", ""],
            [48, 60.01, "Suspected spine or neck injury", "Don’t move them. Support the head and neck so they stay still, call 911, and only move them if there is immediate danger.", ""]
        ];
        var T = 60, t = 0, playing = false, last = 0, R = function () {};
        var $ = function (i) { return root.querySelector('#' + i); };
        function cl(x) { return Math.max(0, Math.min(1, x)); }
        function sm(x) { x = cl(x); return x * x * (3 - 2 * x); }
        function vis(id, v) { $(id).style.opacity = v; }
        function at(id, x, y) { $(id).setAttribute("transform", "translate(" + x + "," + y + ")"); }
        function hud(b, l, c) { var e = $("hb"); e.textContent = b; e.style.color = c || "var(--fg)"; $("hl").textContent = l || ""; }
        function bub(s) { vis("bubble", s ? 1 : 0); $("bubT").textContent = s || ""; }
        function lab(s, x, y) { var e = $("lab"); e.textContent = s || ""; e.setAttribute("x", x || 366); e.setAttribute("y", y || 300); }
        function ln(id, a, b, c, d) { var e = $(id); e.setAttribute("x1", a); e.setAttribute("y1", b); e.setAttribute("x2", c); e.setAttribute("y2", d); }
        function arm(p, sx, sy, hx, hy, out, L) { L = L || 125; var dx = hx - sx, dy = hy - sy, D = Math.hypot(dx, dy) || 1, h = Math.min(36, Math.sqrt(Math.max(0, L * L / 4 - D * D / 4))); var nx = -dy / D, ny = dx / D; if (nx * out < 0) { nx = -nx; ny = -ny; } var ex = (sx + hx) / 2 + nx * h, ey = (sy + hy) / 2 + ny * h; ln(p + "s", sx, sy, ex, ey); ln(p + "f", ex, ey, hx, hy); }
        var C = 300;
        function rest(ox, oy) { return [C + ox - 30, 396 + oy, C + ox + 30, 396 + oy]; }
        function pose(PS, t) {
            var k = 0; for (var i = 0; i < PS.length; i++) { if (t >= PS[i][0]) k = i; }
            for (var j = 1; j < PS.length; j++) { if (Math.abs(t - PS[j][0]) < .6) { var w = sm((t - (PS[j][0] - .6)) / 1.2), a = PS[j - 1][1](t), b = PS[j][1](t); return a.map(function (v, n) { return v + (b[n] - v) * w; }); } }
            return PS[k][1](t);
        }
        function resc(P, gl, ph) {
            var ox = P[0], oy = P[1], sy = 362 + oy; at("rsc", ox, oy);
            arm("aL", C + ox - 44, sy, P[2], P[3], -1); arm("aR", C + ox + 44, sy, P[4], P[5], 1);
            var f = gl ? "var(--glove)" : "var(--skin)"; $("hL").style.fill = f; $("hR").style.fill = f; at("hL", P[2], P[3]); at("hR", P[4], P[5]);
            vis("phone", ph ? 1 : 0); $("phone").setAttribute("transform", "translate(" + (P[4] + 3) + "," + (P[5] - 4) + ") rotate(10)");
        }
        var PS = [[0, function () { var r = rest(20, 0); return [20, 0, r[0], r[1], r[2], r[3]]; }],
        [8, function (t) { var r = rest(20, 0), k = .5 - .5 * Math.cos((t - 8) * 1.2); return [20, 0, r[0], r[1], lp(r[2], 336, Math.min(1, k * 1.4)), lp(r[3], 292, Math.min(1, k * 1.4))]; }],
        [16, function () { return [13, 0, 282, 264, 334, 286]; }], [30, function () { return [13, 0, 296, 266, 316, 266]; }],
        [38, function () { var r = rest(170, 0); return [170, 0, r[0], r[1], r[2], r[3]]; }], [48, function () { return [-134, 0, 154, 224, 178, 224]; }]];
        function lp(a, b, k) { return a + (b - a) * k; }
        R = function (t, si) {
            resc(pose(PS, t), t >= 2, false);
            vis("pain", t < 8 ? (.5 + .5 * Math.sin(t * 6)) : 0); vis("xx", t >= 9 && t < 16 ? 1 : 0);
            vis("splint", sm((t - 16.3) / .6)); at("splint", 0, 36 * (1 - sm((t - 16.3) / 2.2)));
            vis("tie1", sm((t - 23) / .5)); vis("tie2", sm((t - 26) / .5));
            vis("cold", t >= 30.3 && t < 38.5 ? sm((t - 30.3) / .5) : 0);
            vis("inset", si === 4 ? 1 : 0); vis("icl", sm((t - 41) / 1)); vis("ihand", t >= 44.5 && t < 48 ? 1 : 0);
            vis("tw", sm((t - 49) / .8));
            var l = "", x = 366, y = 300;
            if (t < 8) l = "Bent shape, swelling, severe pain"; else if (t >= 8 && t < 16) l = "Don’t straighten it"; else if (t >= 16 && t < 30) l = "Tie above and below the break";
            else if (t >= 30 && t < 38) l = "Cloth-wrapped cold pack"; else if (t >= 48) { l = "Hold the head and neck still"; x = 216; y = 100; }
            lab(l, x, y);
            bub(t < 8 ? "It really hurts!" : (t >= 48 ? "Stay still. Help is coming." : ""));
            if (t < 8) hud("Fracture?", "Deformity · swelling · pain", "var(--red)"); else if (t < 16) hud("Don’t straighten", "", "var(--red)");
            else if (t < 30) hud("Splinting", "Above and below the break", "var(--amb)"); else if (t < 38) hud("Cold pack", Math.round(sm((t - 30.3) / 7) * 20) + " / 20 min", "var(--water)");
            else if (t < 48) hud("Open fracture", "Cover, don’t push", "var(--red)"); else hud("Spine or neck?", "Keep still", "var(--red)");
        };
        function render() {
            var si = 0; for (var i = 0; i < SC.length; i++) { if (t >= SC[i][0] && t < SC[i][1]) { si = i; break; } }
            $("ttl").textContent = SC[si][2]; $("txt").textContent = SC[si][3];
            R(t, si);
            $("fill").style.width = (Math.min(t / T, 1) * 100) + "%";
            var m = Math.min(Math.floor(t), 60); $("tm").textContent = "0:" + (m < 10 ? "0" : "") + m; $("trk").setAttribute("aria-valuenow", m);
        }
        function loop(now) {
            if (!root.isConnected) { fracRAF = 0; return; }   // guide closed → stop the loop
            if (playing) { t += (now - last) / 1000; last = now; if (t >= T) { t = T - .001; playing = false; $("play").textContent = "Replay"; } }
            render(); fracRAF = requestAnimationFrame(loop);
        }
        fracRAF = requestAnimationFrame(function (n) { last = n; loop(n); });
        $("play").onclick = function () { if (t >= T - .01) t = 0; playing = !playing; last = performance.now(); $("play").textContent = playing ? "Pause" : "Play"; };
        $("rst").onclick = function () { t = 0; playing = true; last = performance.now(); $("play").textContent = "Pause"; };
        $("trk").onclick = function (e) { var r = this.getBoundingClientRect(); t = Math.max(0, Math.min(T - .01, (e.clientX - r.left) / r.width * T)); };
        $("trk").onkeydown = function (e) { if (e.key === "ArrowRight") t = Math.min(T - .01, t + 3); if (e.key === "ArrowLeft") t = Math.max(0, t - 3); };
        SC.forEach(function (s) { if (s[0] > 0) { var m = document.createElement("s"); m.style.left = (s[0] / T * 100) + "%"; $("trk").appendChild(m); } });
        render();
    }

    // ------------------------------------------------------------
    // Wounds 60-second walkthrough (First Aid → Wounds tab)
    // Scoped port of the standalone "wounds in 60 seconds" animation. Its CSS
    // lives in dashboard.html (every rule gated behind .g-wound); the markup is
    // injected below and initWound() wires it up right after the guide renders.
    // ------------------------------------------------------------
    const WOUND_HTML =
        '<div class="g-wound"><div class="cpr-main">' +
            '<h1>First aid: wounds (60-second walkthrough)</h1>' +
            '<div class="stage">' +
            '<svg viewBox="0 0 800 440" role="img" aria-label="Animation of cleaning and dressing a minor cut, then deep, dirty or animal-bite wounds that need hospital care">' +
            '<rect width="800" height="440" fill="var(--wall)"/><rect y="330" width="800" height="110" fill="var(--ground)"/>' +
            '<rect x="300" y="338" width="470" height="92" rx="24" fill="var(--sink)"/>' +
            '<path d="M520,0 V58 Q520,84 498,84 H482 Q470,84 470,96 V106" fill="none" stroke="var(--rubble)" stroke-width="14" stroke-linecap="round"/>' +
            '<line id="w2" x1="490" y1="310" x2="490" y2="360" stroke="var(--water)" stroke-width="6" stroke-dasharray="10 8" stroke-linecap="round"/>' +
            '<line id="w3" x1="528" y1="308" x2="528" y2="360" stroke="var(--water)" stroke-width="6" stroke-dasharray="10 8" stroke-linecap="round"/>' +
            '<g><rect x="70" y="262" width="380" height="44" rx="20" fill="var(--skin)"/><ellipse cx="505" cy="284" rx="66" ry="24" fill="var(--skin)"/>' +
            '<rect x="544" y="266" width="64" height="11" rx="5.5" fill="var(--skin)"/><rect x="548" y="280" width="68" height="11" rx="5.5" fill="var(--skin)"/><rect x="544" y="294" width="62" height="11" rx="5.5" fill="var(--skin)"/>' +
            '<rect id="cuff" x="0" y="250" width="92" height="68" rx="14" fill="var(--pshirt)"/></g>' +
            '<g id="cut"><path d="M446,276 l16,6 l14,-6 l16,6" stroke="var(--blood)" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><g id="drip" fill="var(--blood)"><circle cx="458" cy="291" r="3.5"/><circle cx="480" cy="293" r="3"/></g></g>' +
            '<g id="bite" fill="var(--blood)"><circle cx="448" cy="272" r="3"/><circle cx="460" cy="268" r="3"/><circle cx="474" cy="268" r="3"/><circle cx="487" cy="272" r="3"/><circle cx="448" cy="294" r="3"/><circle cx="460" cy="298" r="3"/><circle cx="474" cy="298" r="3"/><circle cx="487" cy="294" r="3"/></g>' +
            '<rect id="pad3" x="446" y="264" width="46" height="32" rx="3" fill="var(--gauze)" stroke="var(--line)"/>' +
            '<ellipse id="dab" cx="470" cy="279" rx="16" ry="6" fill="#fff7d6" stroke="#e6d9a8"/>' +
            '<g id="bdg"><rect x="436" y="262" width="66" height="34" rx="6" fill="#e7c9a1" stroke="#c9a678"/><rect x="456" y="268" width="26" height="22" rx="2" fill="var(--gauze)"/></g>' +
            '<circle id="ring3" cx="470" cy="279" r="46" fill="none" stroke="var(--water)" stroke-width="3" stroke-dasharray="4 7"/><circle id="soap" r="8" fill="#fff" stroke="var(--water)" stroke-width="3"/>' +
            '<g id="foam" fill="#fff" stroke="var(--water)" stroke-width="2"><circle id="f0" r="9"/><circle id="f1" r="7"/><circle id="f2" r="10"/><circle id="f3" r="6"/></g>' +
            '<line id="water" x1="470" y1="116" x2="470" y2="266" stroke="var(--water)" stroke-width="7" stroke-dasharray="12 9" stroke-linecap="round"/>' +
            '<g id="tube"><rect x="-10" y="-36" width="20" height="46" rx="6" fill="#e9eef3" stroke="#8aa0b6"/><rect x="-10" y="-36" width="20" height="10" fill="var(--red)"/><rect x="-4" y="10" width="8" height="10" fill="#8aa0b6"/></g>' +
            '<ellipse id="hp" rx="22" ry="10" fill="var(--glove)"/>' +
            '<g id="gl" transform="translate(630,170)" fill="var(--skin)" stroke="var(--skin2)" stroke-width="1.5"><g transform="translate(-34,0)"><ellipse rx="20" ry="24"/><rect x="-18" y="-48" width="8" height="30" rx="4"/><rect x="-8" y="-54" width="8" height="34" rx="4"/><rect x="2" y="-54" width="8" height="34" rx="4"/><rect x="12" y="-48" width="8" height="30" rx="4"/><rect x="-32" y="-12" width="8" height="26" rx="4" transform="rotate(-30 -28 0)"/></g><g transform="translate(34,0) scale(-1,1)"><ellipse rx="20" ry="24"/><rect x="-18" y="-48" width="8" height="30" rx="4"/><rect x="-8" y="-54" width="8" height="34" rx="4"/><rect x="2" y="-54" width="8" height="34" rx="4"/><rect x="12" y="-48" width="8" height="30" rx="4"/><rect x="-32" y="-12" width="8" height="26" rx="4" transform="rotate(-30 -28 0)"/></g>' +
            '<text y="54" text-anchor="middle" font-size="12" fill="var(--muted)" stroke="none">Wash hands, or wear gloves</text><text y="70" text-anchor="middle" font-size="12" fill="var(--muted)" stroke="none">or a clean plastic bag</text></g>' +
            '<g id="p0" transform="translate(140,170)"><rect x="-3" y="-30" width="6" height="56" fill="#8a7a69"/><rect x="-16" y="-36" width="32" height="8" rx="3" fill="#7a6a59"/><circle cy="8" r="3.5" fill="#b5654a"/><circle cy="-12" r="3" fill="#b5654a"/><text y="52" text-anchor="middle" font-size="12.5" font-weight="600" fill="var(--fg)">rusty nail</text></g>' +
            '<g id="p1" transform="translate(250,170)"><path d="M-10,28 L0,-34 L10,28 Z" fill="#5c8a3a"/><text y="52" text-anchor="middle" font-size="12.5" font-weight="600" fill="var(--fg)">thorn</text></g>' +
            '<g id="p2" transform="translate(360,170)"><path d="M-26,10 Q0,-28 26,10" fill="none" stroke="var(--fg)" stroke-width="4"/><g fill="var(--blood)"><circle cx="-18" cy="0" r="3.5"/><circle cx="-6" cy="-8" r="3.5"/><circle cx="6" cy="-8" r="3.5"/><circle cx="18" cy="0" r="3.5"/></g><text y="52" text-anchor="middle" font-size="12.5" font-weight="600" fill="var(--fg)">animal bite</text></g>' +
            '<path id="arr" d="M416,170 H530 M518,158 L532,170 L518,182" stroke="var(--red)" stroke-width="4" fill="none" stroke-linecap="round"/>' +
            '<g id="hos" transform="translate(630,170)"><rect x="-44" y="-40" width="88" height="80" rx="8" fill="var(--card)" stroke="var(--red)" stroke-width="3"/><path d="M-6,-24 h12 v14 h14 v12 h-14 v14 h-12 v-14 h-14 v-12 h14z" fill="var(--red)"/><text y="62" text-anchor="middle" font-size="12.5" font-weight="600" fill="var(--fg)">Hospital: tetanus</text><text y="78" text-anchor="middle" font-size="12.5" font-weight="600" fill="var(--fg)">prophylaxis</text></g>' +
            '<g id="abc" transform="translate(40,70)"><rect width="380" height="130" rx="14" fill="var(--card)" stroke="var(--line)" stroke-width="2"/><text x="190" y="38" text-anchor="middle" font-size="17" font-weight="700" fill="var(--fg)">Rabies post-exposure treatment</text><text x="190" y="66" text-anchor="middle" font-size="15" fill="var(--fg)">at an Animal Bite Center</text><text x="190" y="106" text-anchor="middle" font-size="24" font-weight="800" fill="var(--red)">within 24 hours</text></g>' +
            '<g id="ring2" transform="translate(96,112)"><circle r="42" fill="var(--card)" stroke="var(--line)" stroke-width="8"/><circle id="arc" r="42" fill="none" stroke="var(--water)" stroke-width="8" stroke-dasharray="0 264" stroke-linecap="round" transform="rotate(-90)"/><text id="rt" text-anchor="middle" y="6" font-size="17" font-weight="700" fill="var(--fg)"></text><text text-anchor="middle" y="26" font-size="11" fill="var(--muted)">minutes</text></g>' +
            '<text id="lab" x="366" y="300" font-size="13" font-weight="600" fill="var(--fg)"></text>' +
            '<g id="bubble"><rect x="250" y="16" width="300" height="44" rx="12" fill="var(--card)" stroke="var(--line)" stroke-width="2"/><text id="bubT" x="400" y="45" text-anchor="middle" font-size="19" font-weight="600" fill="var(--fg)"></text></g>' +
            '</svg>' +
            '<div class="hud"><b id="hb"></b><span id="hl"></span></div>' +
            '</div>' +
            '<div class="info" aria-live="polite"><h2 id="ttl"></h2><p id="txt"></p></div>' +
            '<div class="bar"><button id="play" class="main" type="button">Play</button><button id="rst" type="button">Restart</button>' +
            '<div class="track" id="trk" role="slider" aria-label="Timeline" aria-valuemin="0" aria-valuemax="60" aria-valuenow="0" tabindex="0"><i></i><u id="fill"></u></div><span class="time" id="tm">0:00</span></div>' +
            '<p class="note">Educational overview, not a substitute for training. Take a certified first aid course. Always call 911 first in an emergency, then begin care. Steps follow the First Aid guide in your app.</p>' +
        '</div></div>';

    let woundRAF = 0;

    function renderWound() { return WOUND_HTML; }

    function initWound() {
        const root = document.querySelector('.g-wound');
        if (!root) return;
        if (woundRAF) { cancelAnimationFrame(woundRAF); woundRAF = 0; }

        var SC = [
            [0, 7, "1. Protect yourself", "Wash your hands or wear gloves or a plastic bag first.", ""],
            [7, 20, "2. Rinse the cut", "Rinse the cut under clean running water for 5 minutes. Wash around the wound, not into it.", ""],
            [20, 34, "3. Pressure, ointment, bandage", "Apply clean pressure to stop the bleeding, then antibiotic ointment and a bandage.", ""],
            [34, 46, "Deep, dirty or rusty wounds", "Any puncture wound (nail, thorn, animal bite): go to a hospital for tetanus prophylaxis.", ""],
            [46, 60.01, "Animal bites", "Wash for 15 minutes with soap and water, then get rabies post-exposure treatment at an Animal Bite Center within 24 hours.", ""]
        ];
        var T = 60, t = 0, playing = false, last = 0, R = function () {};
        var $ = function (i) { return root.querySelector('#' + i); };
        function cl(x) { return Math.max(0, Math.min(1, x)); }
        function sm(x) { x = cl(x); return x * x * (3 - 2 * x); }
        function vis(id, v) { $(id).style.opacity = v; }
        function at(id, x, y) { $(id).setAttribute("transform", "translate(" + x + "," + y + ")"); }
        function hud(b, l, c) { var e = $("hb"); e.textContent = b; e.style.color = c || "var(--fg)"; $("hl").textContent = l || ""; }
        function bub(s) { vis("bubble", s ? 1 : 0); $("bubT").textContent = s || ""; }
        function lab(s, x, y) { var e = $("lab"); e.textContent = s || ""; e.setAttribute("x", x || 366); e.setAttribute("y", y || 300); }
        function ln(id, a, b, c, d) { var e = $(id); e.setAttribute("x1", a); e.setAttribute("y1", b); e.setAttribute("x2", c); e.setAttribute("y2", d); }
        function arm(p, sx, sy, hx, hy, out, L) { L = L || 125; var dx = hx - sx, dy = hy - sy, D = Math.hypot(dx, dy) || 1, h = Math.min(36, Math.sqrt(Math.max(0, L * L / 4 - D * D / 4))); var nx = -dy / D, ny = dx / D; if (nx * out < 0) { nx = -nx; ny = -ny; } var ex = (sx + hx) / 2 + nx * h, ey = (sy + hy) / 2 + ny * h; ln(p + "s", sx, sy, ex, ey); ln(p + "f", ex, ey, hx, hy); }
        function mixc(a, b, k) { return "rgb(" + a.map(function (v, i) { return Math.round(v + (b[i] - v) * k); }).join(",") + ")"; }
        function water(on, t) { ["water", "w2", "w3"].forEach(function (i) { vis(i, on ? 1 : 0); $(i).setAttribute("stroke-dashoffset", -t * 45); }); }
        function timer(f, N, show) { vis("ring2", show ? 1 : 0); $("arc").setAttribute("stroke-dasharray", (cl(f) * 264) + " 264"); $("rt").textContent = Math.round(cl(f) * N) + "/" + N; }
        R = function (t, si) {
            vis("gl", t < 7 ? 1 : 0); $("gl").style.fill = t >= 3 ? "var(--glove)" : "var(--skin)";
            var w1 = (t >= 7.5 && t < 20), w2 = (t >= 46 && t < 54.5); water(w1 || w2, t);
            timer(w1 ? sm((t - 7.5) / 12) : sm((t - 46) / 8), w1 ? 5 : 15, w1 || w2);
            vis("cut", t < 46 ? 1 : 0); vis("drip", t < 20.3 ? 1 : 0); vis("bite", t >= 46 ? 1 : 0);
            var ro = t >= 12 && t < 20 ? 1 : 0; vis("ring3", ro); vis("soap", ro); at("soap", 470 + 46 * Math.cos(t * 3), 279 + 46 * Math.sin(t * 3));
            vis("pad3", t >= 20.3 && t < 29 ? sm((t - 20.3) / .4) : 0); vis("hp", t >= 20.3 && t < 25.5 ? 1 : 0); at("hp", 468, 250 + 7 * Math.sin((t - 20.3) * 5));
            vis("tube", t >= 25.5 && t < 29 ? 1 : 0); at("tube", 470, 222 + 8 * Math.sin((t - 25.5) * 3)); vis("dab", t >= 27 && t < 29.5 ? 1 : 0);
            vis("bdg", t >= 29.5 && t < 46 ? sm((t - 29.5) / .5) : 0); at("bdg", 0, -30 * (1 - sm((t - 29.5) / 1)));
            for (var i = 0; i < 3; i++) vis("p" + i, t >= 34.3 + i * 1.2 && t < 46 ? sm((t - 34.3 - i * 1.2) / .4) : 0);
            var h = t >= 39 && t < 46 ? sm((t - 39) / .5) : 0; vis("hos", h); vis("arr", h);
            vis("foam", w2 ? 1 : 0); for (i = 0; i < 4; i++) at("f" + i, 445 + i * 26, 262 - 6 * Math.abs(Math.sin(t * 3 + i)));
            vis("abc", sm((t - 54.5) / .7));
            if (t < 7) hud("Gloves on", "Protect yourself", "var(--glove)"); else if (t < 20) hud("Rinse", "5 minutes", "var(--water)"); else if (t < 34) hud("Clean and cover", "", "var(--green)");
            else if (t < 46) hud("High risk", "Tetanus", "var(--red)"); else if (t < 54.5) hud("Bite: wash", "15 min, soap and water", "var(--water)"); else hud("Within 24 h", "Animal Bite Center", "var(--red)");
        };
        function render() {
            var si = 0; for (var i = 0; i < SC.length; i++) { if (t >= SC[i][0] && t < SC[i][1]) { si = i; break; } }
            $("ttl").textContent = SC[si][2]; $("txt").textContent = SC[si][3];
            R(t, si);
            $("fill").style.width = (Math.min(t / T, 1) * 100) + "%";
            var m = Math.min(Math.floor(t), 60); $("tm").textContent = "0:" + (m < 10 ? "0" : "") + m; $("trk").setAttribute("aria-valuenow", m);
        }
        function loop(now) {
            if (!root.isConnected) { woundRAF = 0; return; }   // guide closed → stop the loop
            if (playing) { t += (now - last) / 1000; last = now; if (t >= T) { t = T - .001; playing = false; $("play").textContent = "Replay"; } }
            render(); woundRAF = requestAnimationFrame(loop);
        }
        woundRAF = requestAnimationFrame(function (n) { last = n; loop(n); });
        $("play").onclick = function () { if (t >= T - .01) t = 0; playing = !playing; last = performance.now(); $("play").textContent = playing ? "Pause" : "Play"; };
        $("rst").onclick = function () { t = 0; playing = true; last = performance.now(); $("play").textContent = "Pause"; };
        $("trk").onclick = function (e) { var r = this.getBoundingClientRect(); t = Math.max(0, Math.min(T - .01, (e.clientX - r.left) / r.width * T)); };
        $("trk").onkeydown = function (e) { if (e.key === "ArrowRight") t = Math.min(T - .01, t + 3); if (e.key === "ArrowLeft") t = Math.max(0, t - 3); };
        SC.forEach(function (s) { if (s[0] > 0) { var m = document.createElement("s"); m.style.left = (s[0] / T * 100) + "%"; $("trk").appendChild(m); } });
        render();
    }

    // ------------------------------------------------------------
    // Evacuation 60-second walkthrough (Offline Toolkit → Evacuation Procedures)
    // Hand-authored in the same SVG + timeline style as the first aid ports. Its
    // CSS lives in dashboard.html (every rule gated behind .g-evac); the markup is
    // injected below and initEvac() wires it up right after the guide renders.
    // ------------------------------------------------------------
    const EVAC_HTML =
        '<div class="g-evac"><div class="cpr-main">' +
            '<h1>Evacuation walkthrough (60 seconds)</h1>' +
            '<div class="stage">' +
            '<svg viewBox="0 0 800 440" role="img" aria-label="Animation of a family evacuating: warning siren, grab the go-bag, secure the gas and power, walk as one group, detour around flood water, register at the evacuation center, then wait for the all-clear">' +
            '<rect width="800" height="440" fill="var(--wall)"/><rect y="330" width="800" height="110" fill="var(--ground)"/>' +
            '<g id="house"><rect x="40" y="180" width="200" height="150" fill="var(--card)" stroke="var(--line)" stroke-width="3"/><path d="M22,182 L140,108 L258,182 Z" fill="var(--red)"/><rect x="118" y="252" width="46" height="78" rx="4" fill="var(--wood)"/><rect x="60" y="212" width="42" height="34" rx="3" fill="var(--water)" opacity=".45" stroke="var(--line)"/><rect x="176" y="212" width="42" height="34" rx="3" fill="var(--water)" opacity=".45" stroke="var(--line)"/></g>' +
            '<line x1="240" y1="300" x2="268" y2="300" stroke="var(--rubble)" stroke-width="6"/>' +
            '<g id="mains" transform="translate(252,252)"><rect x="-14" y="-12" width="28" height="24" rx="4" fill="var(--card)" stroke="var(--line)" stroke-width="2"/><rect id="mainsSw" x="-4" y="-9" width="8" height="18" rx="3" fill="var(--green)"/></g>' +
            '<g id="valve" transform="translate(252,296)"><circle r="9" fill="none" stroke="var(--rubble)" stroke-width="4"/><line x1="-9" y1="0" x2="9" y2="0" stroke="var(--rubble)" stroke-width="4"/><line x1="0" y1="-9" x2="0" y2="9" stroke="var(--rubble)" stroke-width="4"/></g>' +
            '<g id="center"><rect x="560" y="196" width="200" height="134" fill="var(--card)" stroke="var(--green)" stroke-width="3"/><rect x="560" y="196" width="200" height="34" fill="var(--green)"/><text x="660" y="219" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">EVACUATION CENTER</text><rect x="638" y="268" width="46" height="62" rx="4" fill="var(--wood)"/><rect x="578" y="244" width="40" height="30" rx="3" fill="var(--water)" opacity=".45" stroke="var(--line)"/><rect x="702" y="244" width="40" height="30" rx="3" fill="var(--water)" opacity=".45" stroke="var(--line)"/></g>' +
            '<path id="route" d="M150,328 Q400,214 650,328" fill="none" stroke="var(--line)" stroke-width="4" stroke-dasharray="10 8"/>' +
            '<path id="routeFill" d="M150,328 Q400,214 650,328" fill="none" stroke="var(--green)" stroke-width="4" stroke-linecap="round"/>' +
            '<g id="flood"><rect x="280" y="298" width="240" height="32" rx="6" fill="var(--water)" opacity=".75"/><path d="M280,300 q30,-9 60,0 t60,0 t60,0 t60,0" fill="none" stroke="var(--water)" stroke-width="4"/></g>' +
            '<g id="desk" transform="translate(600,326)"><rect x="-56" y="-16" width="112" height="12" rx="4" fill="var(--band)"/><rect x="-50" y="-4" width="100" height="34" rx="6" fill="var(--wood)"/><text y="-24" text-anchor="middle" font-size="13" font-weight="700" fill="var(--fg)">Registration</text></g>' +
            '<g id="form" transform="translate(600,262)"><rect x="-16" y="-22" width="32" height="42" rx="4" fill="var(--gauze)" stroke="var(--line)" stroke-width="2"/><rect x="-8" y="-26" width="16" height="8" rx="2" fill="var(--band)"/><path id="chk" d="M-8,2 l6,7 l11,-14" fill="none" stroke="var(--green)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>' +
            '<g id="bag" transform="translate(188,322)"><rect x="-12" y="-18" width="24" height="28" rx="6" fill="var(--amb)"/><path d="M-6,-18 q6,-11 12,0" fill="none" stroke="var(--band)" stroke-width="3"/><rect x="-8" y="-6" width="16" height="7" rx="2" fill="var(--band)"/></g>' +
            '<g id="fam" transform="translate(150,328)"><g><circle cy="-52" r="10" fill="var(--skin)"/><rect x="-9" y="-44" width="18" height="26" rx="6" fill="var(--rescuer)"/><rect x="-8" y="-18" width="7" height="18" rx="3" fill="var(--pants)"/><rect x="1" y="-18" width="7" height="18" rx="3" fill="var(--pants)"/><rect x="-10" y="-2" width="9" height="5" rx="2" fill="var(--shoe)"/><rect x="0" y="-2" width="9" height="5" rx="2" fill="var(--shoe)"/></g><g transform="translate(-22,0) scale(.72)"><circle cy="-52" r="10" fill="var(--skin)"/><rect x="-9" y="-44" width="18" height="26" rx="6" fill="var(--amb)"/><rect x="-8" y="-18" width="7" height="18" rx="3" fill="var(--pants)"/><rect x="1" y="-18" width="7" height="18" rx="3" fill="var(--pants)"/></g><g transform="translate(-46,0)"><circle cy="-52" r="10" fill="var(--skin)"/><rect x="-9" y="-44" width="18" height="26" rx="6" fill="var(--pshirt)"/><rect x="-8" y="-18" width="7" height="18" rx="3" fill="var(--pants)"/><rect x="1" y="-18" width="7" height="18" rx="3" fill="var(--pants)"/><rect x="-10" y="-2" width="9" height="5" rx="2" fill="var(--shoe)"/><rect x="0" y="-2" width="9" height="5" rx="2" fill="var(--shoe)"/><line x1="13" y1="-38" x2="13" y2="-2" stroke="var(--wood)" stroke-width="3"/></g></g>' +
            '<g id="siren" transform="translate(140,80)"><path d="M0,-30 L30,24 H-30 Z" fill="var(--amb)" stroke="var(--red)" stroke-width="3"/><text y="18" text-anchor="middle" font-size="34" font-weight="900" fill="#fff">!</text></g>' +
            '<g id="noret" transform="translate(660,110)"><rect x="-118" y="-34" width="236" height="66" rx="12" fill="var(--card)" stroke="var(--red)" stroke-width="3"/><text y="0" text-anchor="middle" font-size="20" font-weight="800" fill="var(--red)">DO NOT RETURN YET</text><text y="22" text-anchor="middle" font-size="13" fill="var(--fg)">Wait for the barangay all-clear</text></g>' +
            '<g id="ring" transform="translate(718,74)"><circle r="34" fill="var(--card)" stroke="var(--line)" stroke-width="7"/><circle id="arc" r="34" fill="none" stroke="var(--amb)" stroke-width="7" stroke-dasharray="0 214" stroke-linecap="round" transform="rotate(-90)"/><text id="rt" text-anchor="middle" y="2" font-size="17" font-weight="800" fill="var(--fg)"></text><text text-anchor="middle" y="20" font-size="10" fill="var(--muted)">min left</text></g>' +
            '<g id="bubble"><rect x="240" y="16" width="320" height="44" rx="12" fill="var(--card)" stroke="var(--line)" stroke-width="2"/><text id="bubT" x="400" y="45" text-anchor="middle" font-size="18" font-weight="600" fill="var(--fg)"></text></g>' +
            '</svg>' +
            '<div class="hud"><b id="hb"></b><span id="hl"></span></div>' +
            '</div>' +
            '<div class="info" aria-live="polite"><h2 id="ttl"></h2><p id="txt"></p></div>' +
            '<div class="bar"><button id="play" class="main" type="button">Play</button><button id="rst" type="button">Restart</button>' +
            '<div class="track" id="trk" role="slider" aria-label="Timeline" aria-valuemin="0" aria-valuemax="60" aria-valuenow="0" tabindex="0"><i></i><u id="fill"></u></div><span class="time" id="tm">0:00</span></div>' +
            '<p class="note">Educational overview, not a substitute for official instructions. In a real evacuation, always follow the barangay or LGU announcement. The go-bag and route details are in the other tabs of this guide.</p>' +
        '</div></div>';

    let evacRAF = 0;

    function renderEvac() { return EVAC_HTML; }

    function initEvac() {
        const root = document.querySelector('.g-evac');
        if (!root) return;
        if (evacRAF) { cancelAnimationFrame(evacRAF); evacRAF = 0; }

        var SC = [
            [0, 9, "1. Get the warning", "A siren or a barangay announcement means leave now. Do not wait to see how high the water will rise.", ""],
            [9, 20, "2. Grab the go-bag, secure the house", "One person grabs the go-bag; close the gas valve and switch off the main breaker before you walk out.", ""],
            [20, 32, "3. Move as one group", "Walk together — adults in front and at the back, children and elderly in the middle. Hold hands or a rope.", ""],
            [32, 44, "4. Never cross flood water", "Take the higher detour even if it adds 20 minutes. 30 cm of moving water can sweep an adult off their feet.", ""],
            [44, 52, "5. Register at the center", "Report your family head-count, ages, and medical needs at the registration desk, then note your assigned section.", ""],
            [52, 60.01, "6. Stay until the all-clear", "Do not return home until the barangay or LGU declares it safe — live wires, snakes, and collapse hazards remain.", ""]
        ];
        var T = 60, t = 0, playing = false, last = 0, R = function () {};
        var $ = function (i) { return root.querySelector('#' + i); };
        function cl(x) { return Math.max(0, Math.min(1, x)); }
        function sm(x) { x = cl(x); return x * x * (3 - 2 * x); }
        function vis(id, v) { $(id).style.opacity = v; }
        function at(id, x, y) { $(id).setAttribute("transform", "translate(" + x + "," + y + ")"); }
        function hud(b, l, c) { var e = $("hb"); e.textContent = b; e.style.color = c || "var(--fg)"; $("hl").textContent = l || ""; }
        function bub(s) { vis("bubble", s ? 1 : 0); $("bubT").textContent = s || ""; }
        function bez(u) { var a = 1 - u; return [a * a * 150 + 2 * a * u * 400 + u * u * 650, a * a * 328 + 2 * a * u * 214 + u * u * 328]; }
        R = function (t, si) {
            var sp = t < 9 ? (0.5 + 0.5 * Math.abs(Math.sin(t * 4))) : 0;   // siren pulse
            vis("siren", sp);
            $("siren").setAttribute("transform", "translate(140,80) scale(" + (t < 9 ? 1 + 0.06 * Math.abs(Math.sin(t * 4)) : 1) + ")");
            var fx = 150, fy = 328;                                          // family walks the detour arc
            if (t >= 20) { var u = t >= 44 ? 1 : sm((t - 20) / 24); var p = bez(u); fx = p[0]; fy = p[1]; }
            at("fam", Math.round(fx), Math.round(fy));
            var bk = sm((t - 9.6) / 1.4);                                    // hoist the go-bag into hand
            at("bag", Math.round(188 + (fx + 17 - 188) * bk), Math.round(322 + (fy - 28 - 322) * bk));
            var rot = t < 12 ? 0 : (t < 18 ? (t - 12) / 6 * 180 : 180);      // close gas valve
            $("valve").setAttribute("transform", "translate(252,296) rotate(" + rot + ")");
            $("mainsSw").style.fill = t >= 16 ? "var(--muted)" : "var(--green)";   // switch off the mains
            vis("route", t >= 17 ? 0.9 : 0);
            var rp = t <= 20 ? 0 : (t >= 44 ? 1 : sm((t - 20) / 24));
            $("routeFill").style.strokeDasharray = "700";
            $("routeFill").style.strokeDashoffset = String(700 * (1 - rp));
            vis("routeFill", t >= 20 ? 1 : 0);
            vis("flood", t >= 31 ? sm((t - 31) / 1.5) : 0);
            vis("desk", t >= 44 ? sm((t - 44) / 1) : 0);
            vis("form", t >= 46 ? sm((t - 46) / 1) : 0);
            vis("chk", t >= 48 ? sm((t - 48) / 1) : 0);
            vis("noret", t >= 53 ? sm((t - 53) / 1.2) : 0);
            vis("ring", t < 46 ? 1 : 0);
            var f2 = cl(t / 44);                                             // "minutes left" ring
            $("arc").setAttribute("stroke-dasharray", (f2 * 214) + " 214");
            $("rt").textContent = String(Math.round(30 * (1 - f2)));
            if (t < 9) bub("EVACUATE NOW"); else if (t >= 22 && t < 32) bub("Children in the middle");
            else if (t >= 34 && t < 44) bub("Never cross flood water"); else if (t >= 53) bub("Wait for the all-clear"); else bub("");
            if (t < 9) hud("Evacuate", "leave now", "var(--red)"); else if (t < 20) hud("Grab & secure", "bag, gas, power", "var(--amb)");
            else if (t < 32) hud("Walk as one", "children in the middle", "var(--rescuer)"); else if (t < 44) hud("Detour", "never cross water", "var(--water)");
            else if (t < 52) hud("Register", "head-count + needs", "var(--green)"); else hud("Stay put", "wait for all-clear", "var(--red)");
        };
        function render() {
            var si = 0; for (var i = 0; i < SC.length; i++) { if (t >= SC[i][0] && t < SC[i][1]) { si = i; break; } }
            $("ttl").textContent = SC[si][2]; $("txt").textContent = SC[si][3];
            R(t, si);
            $("fill").style.width = (Math.min(t / T, 1) * 100) + "%";
            var m = Math.min(Math.floor(t), 60); $("tm").textContent = "0:" + (m < 10 ? "0" : "") + m; $("trk").setAttribute("aria-valuenow", m);
        }
        function loop(now) {
            if (!root.isConnected) { evacRAF = 0; return; }   // guide closed → stop the loop
            if (playing) { t += (now - last) / 1000; last = now; if (t >= T) { t = T - .001; playing = false; $("play").textContent = "Replay"; } }
            render(); evacRAF = requestAnimationFrame(loop);
        }
        evacRAF = requestAnimationFrame(function (n) { last = n; loop(n); });
        $("play").onclick = function () { if (t >= T - .01) t = 0; playing = !playing; last = performance.now(); $("play").textContent = playing ? "Pause" : "Play"; };
        $("rst").onclick = function () { t = 0; playing = true; last = performance.now(); $("play").textContent = "Pause"; };
        $("trk").onclick = function (e) { var r = this.getBoundingClientRect(); t = Math.max(0, Math.min(T - .01, (e.clientX - r.left) / r.width * T)); };
        $("trk").onkeydown = function (e) { if (e.key === "ArrowRight") t = Math.min(T - .01, t + 3); if (e.key === "ArrowLeft") t = Math.max(0, t - 3); };
        SC.forEach(function (s) { if (s[0] > 0) { var m = document.createElement("s"); m.style.left = (s[0] / T * 100) + "%"; $("trk").appendChild(m); } });
        render();
    }

    function renderTabs(guide) {
        const tabbar = '<div class="g-tabs">' +
            guide.tabs.map((t, i) => {
                const tone = t.tone ? ' ' + t.tone : '';
                return '<button class="g-tab' + (i === 0 ? ' active' : '') + tone + '" data-gtab="' + i + '">' + esc(t.name) + '</button>';
            }).join('') +
            '</div>';
        const panels = guide.tabs.map((t, i) => {
            let inner = '';
            if (t.custom === 'headcount') inner = renderHeadcount();
            else if (t.custom === 'cpr') inner = renderCPR();
            else if (t.custom === 'bleed') inner = renderBleed();
            else if (t.custom === 'frac') inner = renderFrac();
            else if (t.custom === 'wound') inner = renderWound();
            else inner = (t.sections || []).map(renderSection).join('') + renderCallout(t.callout);
            return '<div class="g-panel' + (i === 0 ? ' active' : '') + '" data-gpanel="' + i + '">' + inner + '</div>';
        }).join('');
        return tabbar + panels;
    }

    function renderChecklist(guide) {
        const saved = loadObj(guide.storageKey, {});
        const total = guide.categories.reduce((n, c) => n + c.items.length, 0);
        const done  = Object.keys(saved).filter(k => saved[k]).length;
        const pct   = total ? Math.round(done / total * 100) : 0;

        let html = '<div class="g-progress">' +
            '<div class="g-bar"><span style="width:' + pct + '%"></span></div>' +
            '<div class="g-lbl" id="gKitPct">' + done + ' / ' + total + ' · ' + pct + '%</div>' +
            '</div>';

        html += '<div class="g-actions">' +
            '<button type="button" class="btn ghost" data-kit-action="reset">Reset all</button>' +
            '<button type="button" class="btn ghost" data-kit-action="share">Print / Save</button>' +
            '</div>';

        guide.categories.forEach(cat => {
            html += '<div class="g-sec"><h4>' + esc(cat.name) + '</h4><ul class="g-check">';
            cat.items.forEach(it => {
                const isDone = !!saved[it.id];
                html += '<li data-kit="' + it.id + '"' + (isDone ? ' class="done"' : '') + '>' +
                    '<div class="cb">' + CHECK_SVG + '</div>' +
                    '<div style="flex:1;min-width:0;">' +
                        '<div class="g-lbl">' + esc(it.label) + '</div>' +
                        (it.note ? '<div class="g-note">' + esc(it.note) + '</div>' : '') +
                    '</div>' +
                    '</li>';
            });
            html += '</ul></div>';
        });
        return html;
    }

    function renderHeadcount() {
        const h = loadObj('rn_evac_head_v1', { adults: 2, children: 1, elderly: 0, pwd: 0, infants: 0, pets: 0 });
        const rows = [
            ['adults',   'Adults',      '18 – 59 yrs'],
            ['children', 'Children',    '2 – 17 yrs'],
            ['infants',  'Infants',     'Under 2 yrs'],
            ['elderly',  'Elderly',     '60+ yrs'],
            ['pwd',      'PWD',         'Any age'],
            ['pets',     'Pets / Livestock', 'Count for transport planning']
        ];
        let html = '<div class="g-callout info">Update this in real time during an evacuation. Bring your phone to the registration desk so barangay personnel can verify your family count at a glance.</div>';
        html += '<div class="hc-grid">';
        rows.forEach(r => {
            const k = r[0];
            html += '<div class="hc-cell">' +
                '<div class="hc-lbl">' + esc(r[1]) + '</div>' +
                '<div style="color:var(--muted);font-size:10.5px;margin-bottom:8px;">' + esc(r[2]) + '</div>' +
                '<div class="hc-row">' +
                    '<button type="button" class="hc-btn" data-hc="' + k + '" data-hc-op="-1" aria-label="Decrease">−</button>' +
                    '<div class="hc-num" data-hc-num="' + k + '">' + (h[k] | 0) + '</div>' +
                    '<button type="button" class="hc-btn" data-hc="' + k + '" data-hc-op="1" aria-label="Increase">+</button>' +
                '</div>' +
            '</div>';
        });
        html += '</div>';
        const total = (h.adults | 0) + (h.children | 0) + (h.infants | 0) + (h.elderly | 0) + (h.pwd | 0);
        html += '<div class="g-sec" style="margin-top:16px;"><h4>Family total (humans)</h4>' +
                '<div class="g-card" style="display:flex;align-items:center;gap:14px;">' +
                    '<div style="font-size:34px;font-weight:800;color:var(--navy);line-height:1;" id="hcTotal">' + total + '</div>' +
                    '<div style="color:var(--muted);font-size:12px;line-height:1.5;">' +
                        'Water: <b style="color:var(--navy);">' + (total * 3) + ' L</b> per 3 days<br>' +
                        'Food: <b style="color:var(--navy);">' + (total * 3) + ' cups rice</b> or <b style="color:var(--navy);">' + (total * 6) + ' canned goods</b><br>' +
                        'Go-bags: <b style="color:var(--navy);">' + Math.max(1, Math.ceil(total / 3)) + '</b> backpack(s)' +
                    '</div>' +
                '</div></div>';
        html += '<div class="g-actions"><button type="button" class="btn ghost" data-hc-action="reset">Reset count</button></div>';
        return html;
    }

    function renderHotlines(guide) {
        let html = '';
        guide.groups.forEach(grp => {
            html += '<div class="g-sec"><h4>' + esc(grp.name) + '</h4>';
            grp.items.forEach(it => {
                const dial = String(it.num).replace(/[^0-9+]/g, '');
                html += '<a class="g-hotline" href="tel:' + dial + '">' +
                    '<div class="hl-ico">' + I.phone + '</div>' +
                    '<div class="hl-body">' +
                        '<div class="hl-name">' + esc(it.name) + '</div>' +
                        '<div class="hl-num">' + esc(it.num) + (it.note ? ' · ' + esc(it.note) : '') + '</div>' +
                    '</div>' +
                    '<div class="hl-go">Call ›</div>' +
                '</a>';
            });
            html += '</div>';
        });
        html += renderCallout(guide.callout);
        return html;
    }

    // ------------------------------------------------------------
    // Open a guide → render into #gdBody
    // ------------------------------------------------------------
    function openGuide(id) {
        const guide = DATA[id];
        if (!guide) return false;
        const body = document.getElementById('gdBody');
        const titleEl = document.getElementById('gdTopTitle');
        const subEl   = document.getElementById('gdTopSub');
        if (!body || !titleEl || !subEl) return false;

        titleEl.textContent = guide.title;
        subEl.textContent   = guide.kicker;

        let html = '<div class="guide-hero">' +
            '<div class="g-kicker">' + esc(guide.kicker) + '</div>' +
            '<div class="g-title">'  + esc(guide.title)  + '</div>' +
            '<div class="g-desc">'   + guide.desc        + '</div>' +
        '</div>';

        if (guide.type === 'accordion')       html += renderAccordion(guide.items);
        else if (guide.type === 'tabs')       html += renderTabs(guide);
        else if (guide.type === 'checklist')  html += renderChecklist(guide);
        else if (guide.type === 'hotlines')   html += renderHotlines(guide);

        html += '<div class="g-actions">' +
            '<button type="button" class="btn ghost" data-tab="guides">‹ Back to Guides</button>' +
            '<button type="button" class="btn primary" data-guide-share="' + id + '">Share guide</button>' +
        '</div>';

        body.innerHTML = html;
        body.setAttribute('data-guide-active', id);
        if (id === 'firstaid') { initCPR(); initBleed(); initFrac(); initWound(); }
        if (id === 'evacuation') { initEvac(); }

        if (typeof window.goTo === 'function') window.goTo('guides-detail');
        else document.dispatchEvent(new CustomEvent('rn-go', { detail: 'guides-detail' }));

        window.scrollTo({ top: 0, behavior: 'instant' });
        return true;
    }

    // Expose
    window.RNGuides = { open: openGuide, DATA: DATA };

    // ------------------------------------------------------------
    // Delegated click handlers
    // ------------------------------------------------------------
    document.addEventListener('click', function (e) {
        // 1) Guide tile on the guides list screen
        const tile = e.target.closest('[data-guide]');
        if (tile) {
            e.preventDefault();
            e.stopPropagation();
            openGuide(tile.getAttribute('data-guide'));
            return;
        }

        // 2) Tab switch inside a tabbed guide
        const tab = e.target.closest('.g-tab');
        if (tab && tab.dataset.gtab != null) {
            const wrap = tab.closest('#gdBody');
            if (!wrap) return;
            wrap.querySelectorAll('.g-tab').forEach(el => el.classList.remove('active'));
            wrap.querySelectorAll('.g-panel').forEach(el => el.classList.remove('active'));
            tab.classList.add('active');
            const panel = wrap.querySelector('.g-panel[data-gpanel="' + tab.dataset.gtab + '"]');
            if (panel) panel.classList.add('active');
            return;
        }

        // 3) Accordion toggle
        const acc = e.target.closest('.g-acc .g-hd');
        if (acc) { acc.parentElement.classList.toggle('open'); return; }

        // 4) Checklist toggle
        const ck = e.target.closest('.g-check > li[data-kit]');
        if (ck) {
            const active = document.getElementById('gdBody').getAttribute('data-guide-active');
            const guide = DATA[active];
            if (!guide || guide.type !== 'checklist') return;
            const key = ck.dataset.kit;
            const saved = loadObj(guide.storageKey, {});
            saved[key] = !saved[key];
            saveObj(guide.storageKey, saved);
            ck.classList.toggle('done', !!saved[key]);
            // recompute progress
            let total = 0, done = 0;
            guide.categories.forEach(c => c.items.forEach(it => { total++; if (saved[it.id]) done++; }));
            const pct = total ? Math.round(done / total * 100) : 0;
            const bar = document.querySelector('#gdBody .g-progress .g-bar > span');
            const lbl = document.getElementById('gKitPct');
            if (bar) bar.style.width = pct + '%';
            if (lbl) lbl.textContent = done + ' / ' + total + ' · ' + pct + '%';
            return;
        }

        // 5) Reset kit
        const kitAction = e.target.closest('[data-kit-action]');
        if (kitAction) {
            if (kitAction.dataset.kitAction === 'reset') {
                if (!confirm('Reset all 72-hour kit checklist items?')) return;
                const active = document.getElementById('gdBody').getAttribute('data-guide-active');
                const guide = DATA[active];
                saveObj(guide.storageKey, {});
                openGuide(active);
            } else if (kitAction.dataset.kitAction === 'share') {
                window.print();
            }
            return;
        }

        // 6) Headcount +/- buttons
        const hc = e.target.closest('.hc-btn[data-hc]');
        if (hc) {
            const k = hc.dataset.hc, op = parseInt(hc.dataset.hcOp, 10);
            const h = loadObj('rn_evac_head_v1', { adults: 2, children: 1, elderly: 0, pwd: 0, infants: 0, pets: 0 });
            h[k] = Math.max(0, Math.min(30, (h[k] | 0) + op));
            saveObj('rn_evac_head_v1', h);
            const numEl = document.querySelector('[data-hc-num="' + k + '"]');
            if (numEl) numEl.textContent = h[k];
            const total = (h.adults | 0) + (h.children | 0) + (h.infants | 0) + (h.elderly | 0) + (h.pwd | 0);
            const totEl = document.getElementById('hcTotal');
            if (totEl) {
                totEl.textContent = total;
                const card = totEl.parentElement;
                const lines = card.querySelectorAll('div > b');
                // Refresh suggested quantities (rebuild whole block safely)
                const sugg = card.nextElementSibling; // nothing needed — we'll rerender
                if (sugg) { /* no-op */ }
                // Update the text list directly:
                const infoDiv = card.children[1];
                if (infoDiv) {
                    infoDiv.innerHTML =
                        'Water: <b style="color:var(--navy);">' + (total * 3) + ' L</b> per 3 days<br>' +
                        'Food: <b style="color:var(--navy);">' + (total * 3) + ' cups rice</b> or <b style="color:var(--navy);">' + (total * 6) + ' canned goods</b><br>' +
                        'Go-bags: <b style="color:var(--navy);">' + Math.max(1, Math.ceil(total / 3)) + '</b> backpack(s)';
                }
            }
            return;
        }

        // 7) Reset headcount
        const hcReset = e.target.closest('[data-hc-action="reset"]');
        if (hcReset) {
            if (!confirm('Reset family head-count?')) return;
            saveObj('rn_evac_head_v1', { adults: 2, children: 1, elderly: 0, pwd: 0, infants: 0, pets: 0 });
            const active = document.getElementById('gdBody').getAttribute('data-guide-active');
            openGuide(active || 'evacuation');
            // Jump to the "My Household" tab (index 3)
            setTimeout(function () {
                const t = document.querySelector('.g-tab[data-gtab="3"]');
                if (t) t.click();
            }, 40);
            return;
        }

        // 8) Share guide (Web Share API when available, else copy summary)
        const share = e.target.closest('[data-guide-share]');
        if (share) {
            const id = share.dataset.guideShare;
            const guide = DATA[id];
            if (!guide) return;
            const text = 'RescueNet guide — ' + guide.title + ': ' + guide.desc.replace(/<[^>]+>/g, '');
            if (navigator.share) {
                navigator.share({ title: guide.title, text: text }).catch(() => {});
            } else {
                try {
                    navigator.clipboard.writeText(text);
                    alert('Guide summary copied to clipboard.');
                } catch (err) {
                    alert(text);
                }
            }
            return;
        }
    }, true);

    // Keyboard support for guide tiles
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const tile = e.target.closest && e.target.closest('[data-guide]');
        if (tile) { e.preventDefault(); openGuide(tile.getAttribute('data-guide')); }
    });

})();
