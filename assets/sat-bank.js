/* =============================================================================
   Replan — SAT starter question bank
   -----------------------------------------------------------------------------
   ORIGINAL questions written in College Board style. These are NOT official
   College Board material and were not reproduced from any released exam.
   Every choice carries its own explanation so a student learns from a wrong
   answer, not just from the right one.

   Schema
     id          stable key, also used for progress tracking
     section     'Reading & Writing' | 'Math'
     domain      scoring domain — this is what the results chart groups by
     topic       finer-grained skill, shown in the weak-topic breakdown
     difficulty  'Easy' | 'Medium' | 'Hard'
     type        'mcq' | 'grid' | 'frq'
     passage     optional stimulus (Reading & Writing)
     stem        the question itself
     choices     mcq only
     answer      mcq: index of the correct choice · grid: array of accepted strings
     why         mcq: one explanation per choice · grid/frq: single string
     rubric      frq only — the points a response must earn
     sample      frq only — a response that would earn full credit
   ============================================================================= */

const SAT_DOMAINS = {
  'Reading & Writing': ['Information and Ideas', 'Craft and Structure', 'Expression of Ideas', 'Standard English Conventions'],
  'Math': ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry']
};

const SAT_BANK = [

/* ---------------------------------------------------------------- Reading & Writing */
{
  id:'rw-wic-1', section:'Reading & Writing', domain:'Craft and Structure', topic:'Words in Context',
  difficulty:'Medium', type:'mcq',
  passage:'Marine biologist Ayana Johnson notes that coral restoration projects often report early success, only for transplanted colonies to decline within a few years. She argues that such projects should be judged not on initial survival rates but on whether the reef remains viable a decade later.',
  stem:'As used in the text, what does the word “viable” most nearly mean?',
  choices:['Profitable','Capable of surviving','Clearly visible','Generally acceptable'],
  answer:1,
  why:[
    'Profitable introduces an economic sense the text never raises. Johnson’s concern is biological persistence, not revenue.',
    'Correct. The sentence contrasts early survival rates with the reef’s condition ten years on, so “viable” must mean capable of continuing to live.',
    'This confuses “viable” with the similar-sounding “visible.” Nothing in the text concerns whether the reef can be seen.',
    'Acceptable would require some standard of approval. The sentence measures whether the reef persists, not whether anyone approves of it.'
  ]
},
{
  id:'rw-struct-1', section:'Reading & Writing', domain:'Craft and Structure', topic:'Text Structure and Purpose',
  difficulty:'Hard', type:'mcq',
  passage:'For decades archaeologists assumed that the earliest inhabitants of the Americas arrived by an inland ice-free corridor. Recent sediment cores from the Pacific coast complicate that picture. They indicate that a coastal route was biologically productive, and therefore passable, centuries before the inland corridor could have supported travelers.',
  stem:'What is the function of the second sentence in the text as a whole?',
  choices:[
    'It presents the evidence that settles a long-standing debate.',
    'It marks a turn from a long-held assumption to the challenge against it.',
    'It concedes a point before restating the original claim.',
    'It defines a term introduced in the previous sentence.'
  ],
  answer:1,
  why:[
    'The sentence announces a complication but supplies no evidence itself — the sediment data arrives in the third sentence. Nor does the text claim anything is settled.',
    'Correct. The first sentence states the long-held assumption and the second announces that new data complicates it, pivoting into the challenge the third sentence develops.',
    'A concession grants ground to an opposing view. This sentence undercuts the prevailing assumption rather than conceding anything to it.',
    'No term from the first sentence is defined in the second.'
  ]
},
{
  id:'rw-cid-1', section:'Reading & Writing', domain:'Information and Ideas', topic:'Central Ideas and Details',
  difficulty:'Medium', type:'mcq',
  passage:'Octopuses have roughly 500 million neurons, but only about a third sit in the central brain. The rest are distributed through the arms, each of which can execute complex movements — locating a crevice, reaching in, retrieving prey — with little central direction. Severed arms briefly continue such behavior on their own.',
  stem:'Which choice best states the main idea of the text?',
  choices:[
    'Octopuses possess more neurons than most invertebrates.',
    'Much of an octopus’s neural processing happens in its arms rather than its brain.',
    'Octopus arms function better when separated from the central brain.',
    'Scientists cannot explain how octopuses coordinate their arms.'
  ],
  answer:1,
  why:[
    'The neuron count appears in the text but only as a starting figure. No comparison with other invertebrates is made, so this cannot be the main idea.',
    'Correct. Every detail — the two-thirds figure, the arms acting with little central direction, the severed-arm observation — supports the point that processing is distributed into the arms.',
    'The severed-arm detail shows arms can act briefly without the brain, not that they work better that way. The text never rates one arrangement above the other.',
    'The text explains the arrangement rather than pleading ignorance about it. No failure of explanation is mentioned.'
  ]
},
{
  id:'rw-evid-1', section:'Reading & Writing', domain:'Information and Ideas', topic:'Command of Evidence',
  difficulty:'Hard', type:'mcq',
  passage:'A restoration ecologist hypothesized that removing an invasive shrub would allow native wildflowers to return on their own, without replanting. To test this, she cleared the shrub from half of a study plot and left the other half untouched.',
  stem:'Which finding, if true, would most strongly support the ecologist’s hypothesis?',
  choices:[
    'Native wildflower cover increased in the cleared half but remained unchanged in the untouched half.',
    'Native wildflower cover increased in both halves of the plot by a similar amount.',
    'The invasive shrub regrew in the cleared half within two seasons.',
    'Native wildflowers grew faster when seeds were added to the cleared half.'
  ],
  answer:0,
  why:[
    'Correct. The hypothesis is that removal alone triggers recovery. Wildflowers returning only where the shrub was cleared isolates removal as the cause, and the untouched half rules out a change affecting the whole site.',
    'If both halves improved equally, something other than shrub removal caused the recovery, which undercuts the hypothesis rather than supporting it.',
    'Regrowth of the shrub describes how durable the clearing was. It says nothing about whether wildflowers returned unaided.',
    'Adding seeds is replanting — the very intervention the hypothesis says should be unnecessary. This tests a different claim.'
  ]
},
{
  id:'rw-inf-1', section:'Reading & Writing', domain:'Information and Ideas', topic:'Inferences',
  difficulty:'Medium', type:'mcq',
  passage:'Museums increasingly publish high-resolution images of their collections online at no charge. Curators once feared this would reduce attendance, reasoning that visitors who had seen a work on screen would feel no need to see it in person. Attendance figures at institutions that opened their archives, however, have _______',
  stem:'Which choice most logically completes the text?',
  choices:[
    'declined more sharply than those at institutions that did not.',
    'remained flat while online traffic fell.',
    'risen rather than fallen.',
    'become impossible to measure accurately.'
  ],
  answer:2,
  why:[
    'This would confirm the curators’ fear. The word “however” signals that what follows contradicts their reasoning, so a sharper decline cannot be right.',
    'Falling online traffic contradicts the premise that these museums opened popular digital archives, and flat attendance would only weakly oppose the fear.',
    'Correct. “However” sets up a reversal of the curators’ expectation that attendance would drop, and a rise is the clearest reversal.',
    'A measurement problem would sidestep the contrast entirely. The sentence promises a result that cuts against the fear, not an absence of data.'
  ]
},
{
  id:'rw-cross-1', section:'Reading & Writing', domain:'Information and Ideas', topic:'Cross-Text Connections',
  difficulty:'Hard', type:'mcq',
  passage:'Text 1: Urban planner Devi Raman argues that removing minimum parking requirements lowers housing costs, since developers no longer pay to build garages that many residents never use.\n\nText 2: Economist Tomas Ruiz agrees that parking mandates raise construction costs but notes that in cities where they were repealed, savings were largely absorbed as developer profit rather than passed to renters.',
  stem:'Based on the texts, how would Ruiz most likely respond to Raman’s argument?',
  choices:[
    'By denying that parking requirements add meaningfully to construction costs.',
    'By accepting her premise about costs while questioning whether renters see the benefit.',
    'By arguing that parking requirements should be strengthened rather than removed.',
    'By claiming that most residents do in fact use the garages developers build.'
  ],
  answer:1,
  why:[
    'Ruiz explicitly agrees that the mandates raise construction costs, so he would not deny it.',
    'Correct. Ruiz grants the cost premise outright, then breaks the chain at the next link, observing that the savings stopped at developers instead of reaching renters.',
    'Ruiz never advocates strengthening the mandates. He only questions who captures the savings from repealing them.',
    'Garage usage is Raman’s point, and Ruiz does not dispute it. His objection concerns where the money went, not who parks.'
  ]
},
{
  id:'rw-bound-1', section:'Reading & Writing', domain:'Standard English Conventions', topic:'Boundaries',
  difficulty:'Medium', type:'mcq',
  passage:'Botanist Agnes Arber spent much of her career on comparative plant morphology _______ she also wrote philosophical works on the nature of biological explanation.',
  stem:'Which choice completes the text so that it conforms to the conventions of Standard English?',
  choices:['; however,','however,',', however','and, however'],
  answer:0,
  why:[
    'Correct. Two independent clauses joined by the conjunctive adverb “however” need a semicolon before it and a comma after it.',
    'This creates a comma splice in effect — two complete sentences run together with only “however” between them and no terminal punctuation before it.',
    'A comma alone cannot join two independent clauses, and “however” is left without the comma that must follow it here.',
    '“And” plus “however” stacks a coordinating conjunction on a conjunctive adverb, which is redundant, and a comma still cannot join the clauses this way.'
  ]
},
{
  id:'rw-form-1', section:'Reading & Writing', domain:'Standard English Conventions', topic:'Form, Structure, and Sense',
  difficulty:'Medium', type:'mcq',
  passage:'The collection of letters that the archive acquired last spring _______ the only surviving correspondence between the two composers.',
  stem:'Which choice completes the text so that it conforms to the conventions of Standard English?',
  choices:['are','were','is','have been'],
  answer:2,
  why:[
    'The verb must agree with “collection,” which is singular. “Letters” sits inside a modifying phrase and cannot control the verb.',
    'This is both plural and past tense. The subject is singular and the sentence describes a present fact.',
    'Correct. The subject is the singular “collection,” so the singular present-tense “is” agrees with it.',
    'Plural again, agreeing mistakenly with “letters” rather than with the head noun “collection.”'
  ]
},
{
  id:'rw-trans-1', section:'Reading & Writing', domain:'Expression of Ideas', topic:'Transitions',
  difficulty:'Medium', type:'mcq',
  passage:'Early attempts to synthesize indigo dye were costly and produced low yields, keeping natural indigo competitive for decades. _______ Adolf von Baeyer’s 1878 route and its later industrial refinements eventually drove the price down far enough to collapse the natural indigo trade.',
  stem:'Which choice completes the text with the most logical transition?',
  choices:['Likewise,','Ultimately,','For instance,','In other words,'],
  answer:1,
  why:[
    '“Likewise” signals similarity, but the second sentence reverses the first — failure gives way to success.',
    'Correct. The sentence describes the eventual outcome of a long process, and “ultimately” marks that arrival at a final result.',
    'The second sentence is not an example of costly low-yield attempts. It describes what displaced them.',
    'Nothing is being restated. The second sentence introduces new events rather than rephrasing the first.'
  ]
},
{
  id:'rw-synth-1', section:'Reading & Writing', domain:'Expression of Ideas', topic:'Rhetorical Synthesis',
  difficulty:'Hard', type:'mcq',
  passage:'While researching, a student has taken these notes:\n• The Antikythera mechanism was recovered from a shipwreck in 1901.\n• It is a geared bronze device dated to roughly the second century BCE.\n• X-ray imaging in 2006 revealed at least 30 interlocking gears.\n• The gearing models the motions of the sun and moon.\n• No comparably complex geared device is known for over a thousand years afterward.',
  stem:'The student wants to emphasize the mechanism’s technological singularity. Which choice most effectively uses relevant information from the notes to accomplish this goal?',
  choices:[
    'The Antikythera mechanism, recovered from a shipwreck in 1901, dates to roughly the second century BCE.',
    'X-ray imaging conducted in 2006 revealed that the mechanism contains at least 30 interlocking gears.',
    'With at least 30 gears modeling solar and lunar motion, the mechanism had no known equal for more than a thousand years.',
    'The mechanism, a geared bronze device, models the motions of the sun and moon.'
  ],
  answer:2,
  why:[
    'Recovery date and age establish context but say nothing about how unusual the device was for its time.',
    'The gear count is impressive but, on its own, offers no point of comparison. Singularity requires showing nothing else matched it.',
    'Correct. It pairs the mechanism’s complexity with the thousand-year gap before anything comparable, which is precisely what makes it singular.',
    'This describes what the device does without indicating that its sophistication was unmatched.'
  ]
},

/* ---------------------------------------------------------------- Math */
{
  id:'m-alg-1', section:'Math', domain:'Algebra', topic:'Linear equations in one variable',
  difficulty:'Easy', type:'mcq',
  stem:'If 3(x − 4) = 2x + 7, what is the value of x?',
  choices:['5','11','19','23'],
  answer:2,
  why:[
    'This comes from dropping the 3 on the left, solving x − 4 = 2x + 7 incorrectly. Distribute first.',
    'This results from distributing to get 3x − 12 but then subtracting 7 instead of adding it.',
    'Correct. Distributing gives 3x − 12 = 2x + 7. Subtract 2x for x − 12 = 7, then add 12 to get x = 19.',
    'This comes from adding 4 rather than 12 after distributing, since the 3 multiplies the −4 as well.'
  ]
},
{
  id:'m-alg-2', section:'Math', domain:'Algebra', topic:'Systems of linear equations',
  difficulty:'Medium', type:'mcq',
  stem:'If 2x + 3y = 12 and x − y = 1, what is the value of x + y?',
  choices:['3','5','7','9'],
  answer:1,
  why:[
    'This is the value of x alone, not the sum requested.',
    'Correct. From x = y + 1, substitute: 2(y + 1) + 3y = 12, so 5y + 2 = 12 and y = 2. Then x = 3, giving x + y = 5.',
    'This would follow from y = 4, which does not satisfy 5y + 2 = 12.',
    'This is the sum if x = 5 and y = 4, neither of which satisfies the system.'
  ]
},
{
  id:'m-alg-3', section:'Math', domain:'Algebra', topic:'Linear functions',
  difficulty:'Medium', type:'mcq',
  stem:'A line in the xy-plane passes through the points (2, 5) and (6, 17). What is the y-intercept of the line?',
  choices:['−1','1','3','5'],
  answer:0,
  why:[
    'Correct. The slope is (17 − 5)/(6 − 2) = 3. Using y = 3x + b with (2, 5): 5 = 6 + b, so b = −1.',
    'This is the sign error from solving 5 = 6 + b as b = 1 instead of b = −1.',
    'This is the slope of the line, not its y-intercept.',
    'This is the y-coordinate of the given point (2, 5), which is not where the line crosses the y-axis.'
  ]
},
{
  id:'m-adv-1', section:'Math', domain:'Advanced Math', topic:'Quadratic functions',
  difficulty:'Medium', type:'mcq',
  stem:'The function f is defined by f(x) = x² − 6x + 5. What is the minimum value of f(x)?',
  choices:['−4','−3','3','5'],
  answer:0,
  why:[
    'Correct. Completing the square gives f(x) = (x − 3)² − 4. The squared term is never negative, so the minimum is −4, reached at x = 3.',
    'This would follow from an arithmetic slip in completing the square. Half of −6 is −3, and (−3)² = 9, so 5 − 9 = −4.',
    'This is the x-value at which the minimum occurs, not the minimum value itself.',
    'This is f(0), the y-intercept. The parabola dips below it before turning back up.'
  ]
},
{
  id:'m-adv-2', section:'Math', domain:'Advanced Math', topic:'Exponential growth',
  difficulty:'Medium', type:'mcq',
  stem:'A colony of 5,000 bacteria grows by 8% each hour. Which expression gives the population after t hours?',
  choices:['5000(0.08)^t','5000(1.08)^t','5000 + 0.08t','5000(1 + 8t)'],
  answer:1,
  why:[
    'A base of 0.08 shrinks the population to 8% of its size each hour, which is severe decay rather than growth.',
    'Correct. Growing by 8% multiplies the population by 1.08 each hour, so after t hours it is 5000(1.08)^t.',
    'This adds a fixed 0.08 per hour, which is linear growth of a fraction of one bacterium — not 8% growth.',
    'This grows linearly at 8 times the original population per hour, not exponentially by 8%.'
  ]
},
{
  id:'m-psd-1', section:'Math', domain:'Problem-Solving and Data Analysis', topic:'Percentages',
  difficulty:'Easy', type:'mcq',
  stem:'After a 30% discount, a jacket costs $63. What was the original price?',
  choices:['$81.90','$90.00','$93.00','$210.00'],
  answer:1,
  why:[
    'This adds 30% back onto $63. Percentages are taken from the original price, so you cannot recover it by adding the same percentage to the sale price.',
    'Correct. The sale price is 70% of the original, so 0.7x = 63 and x = 90.',
    'This adds a flat $30 to the sale price, treating a percentage as a fixed amount.',
    'This divides by 0.3 rather than 0.7, using the discount instead of the fraction actually paid.'
  ]
},
{
  id:'m-psd-2', section:'Math', domain:'Problem-Solving and Data Analysis', topic:'Ratios and rates',
  difficulty:'Easy', type:'mcq',
  stem:'A recipe uses 3 cups of flour to make 24 cookies. At the same rate, how many cups are needed for 60 cookies?',
  choices:['6','7.5','8','9'],
  answer:1,
  why:[
    'This doubles the flour for 48 cookies and stops short of 60.',
    'Correct. The rate is 3/24 = 1/8 cup per cookie, and 60 × 1/8 = 7.5 cups.',
    'This rounds 7.5 up to a whole number, but the proportion gives an exact value.',
    'This triples the recipe, which would make 72 cookies rather than 60.'
  ]
},
{
  id:'m-psd-3', section:'Math', domain:'Problem-Solving and Data Analysis', topic:'Statistics',
  difficulty:'Medium', type:'mcq',
  stem:'For the data set 4, 7, 7, 9, 13, what is the difference between the mean and the median?',
  choices:['0','1','2','3'],
  answer:1,
  why:[
    'This would require the mean and median to be equal, but the value 13 pulls the mean above the middle value.',
    'Correct. The mean is 40/5 = 8 and the median is the middle value 7, so the difference is 1.',
    'This may come from taking the median as 9, the fourth value, rather than the third.',
    'This would follow from a mean of 10, which overcounts the sum of 40.'
  ]
},
{
  id:'m-geo-1', section:'Math', domain:'Geometry and Trigonometry', topic:'Circles',
  difficulty:'Hard', type:'mcq',
  stem:'In the xy-plane, the graph of x² + y² − 6x + 8y = 0 is a circle. What is the radius?',
  choices:['3','4','5','7'],
  answer:2,
  why:[
    'This is half the coefficient of x, an intermediate value from completing the square rather than the radius.',
    'This is half the coefficient of y, again only a step along the way.',
    'Correct. Completing both squares gives (x − 3)² + (y + 4)² = 25, so the radius is √25 = 5.',
    'This adds the two half-coefficients, 3 + 4, instead of taking the square root of their squares summed.'
  ]
},
{
  id:'m-geo-2', section:'Math', domain:'Geometry and Trigonometry', topic:'Right triangle trigonometry',
  difficulty:'Medium', type:'mcq',
  stem:'In a right triangle, θ is an acute angle and sin θ = 3/5. What is cos θ?',
  choices:['3/4','4/5','5/3','5/4'],
  answer:1,
  why:[
    'This is tan θ, the ratio of the opposite leg to the adjacent leg, not cosine.',
    'Correct. With opposite 3 and hypotenuse 5, the adjacent leg is √(25 − 9) = 4, so cos θ = 4/5.',
    'This inverts the sine ratio, giving the cosecant rather than the cosine.',
    'This is the secant, the reciprocal of the cosine.'
  ]
},

/* ---------------------------------------------------------------- Grid-in */
{
  id:'m-grid-1', section:'Math', domain:'Algebra', topic:'Linear equations in one variable',
  difficulty:'Easy', type:'grid',
  stem:'If 5(x + 2) = 3x + 16, what is the value of x?',
  answer:['3'],
  why:'Distribute to get 5x + 10 = 3x + 16. Subtracting 3x gives 2x + 10 = 16, and subtracting 10 gives 2x = 6, so x = 3.'
},
{
  id:'m-grid-2', section:'Math', domain:'Advanced Math', topic:'Quadratic functions',
  difficulty:'Medium', type:'grid',
  stem:'The function f is defined by f(x) = 2x² − 8x + 6. What is the sum of the x-intercepts of the graph of f?',
  answer:['4'],
  why:'Factor: 2x² − 8x + 6 = 2(x² − 4x + 3) = 2(x − 1)(x − 3), so the intercepts are x = 1 and x = 3 and their sum is 4. You can also read it off directly, since the sum of the roots equals −b/a = 8/2 = 4.'
},
{
  id:'m-grid-3', section:'Math', domain:'Geometry and Trigonometry', topic:'Angles',
  difficulty:'Medium', type:'grid',
  stem:'The measures of the three angles of a triangle are in the ratio 2 : 3 : 4. What is the measure, in degrees, of the largest angle?',
  answer:['80'],
  why:'Let the angles be 2x, 3x and 4x. They sum to 180, so 9x = 180 and x = 20. The largest angle is 4x = 80 degrees.'
},

/* ---------------------------------------------------------------- Free response */
{
  id:'frq-hist-1', section:'Reading & Writing', domain:'Information and Ideas', topic:'Short answer — history',
  difficulty:'Medium', type:'frq',
  stem:'Briefly describe ONE specific effect of railroad expansion on the United States economy between 1865 and 1900, and explain how that effect came about.',
  rubric:[
    'Identifies one specific economic effect rather than a vague generality.',
    'Ties the effect directly to railroad expansion rather than to industrialisation at large.',
    'Explains the mechanism — how the railroads produced that effect.',
    'Stays within the 1865–1900 window.'
  ],
  sample:'Railroad expansion created genuinely national markets for agricultural goods. Before the rail network reached deep into the Great Plains, midwestern farmers could sell only within wagon distance, because overland freight costs exceeded the value of bulk grain over any real distance. Rail freight cut the cost per ton-mile sharply, so wheat grown in Kansas could be shipped to Chicago elevators and on to eastern cities while still selling profitably. That access pulled more land into commercial cultivation and tied local crop prices to national rather than local demand.',
  why:'Strong responses name a concrete effect and trace the causal chain. Answers that simply assert that railroads "helped the economy grow" describe a result without the mechanism, which is what the second half of the prompt asks for.'
},
{
  id:'frq-math-1', section:'Math', domain:'Advanced Math', topic:'Justification — quadratics',
  difficulty:'Hard', type:'frq',
  stem:'A function is defined by f(x) = x² − 6x + 5. Determine the minimum value of f and justify your answer algebraically, without appealing to a graph.',
  rubric:[
    'Rewrites the function in vertex form, or uses x = −b/(2a) to locate the vertex.',
    'Shows the algebra rather than stating the vertex outright.',
    'States why this is a minimum and not a maximum.',
    'Gives the minimum value, not just the x-value where it occurs.'
  ],
  sample:'Complete the square. f(x) = x² − 6x + 5 = (x² − 6x + 9) − 9 + 5 = (x − 3)² − 4. For every real x the term (x − 3)² is greater than or equal to 0, and it equals 0 only when x = 3. Therefore f(x) is greater than or equal to −4 for all x, with equality at x = 3. Because the coefficient of x² is positive the parabola opens upward, so this stationary value is a minimum rather than a maximum. The minimum value of f is −4.',
  why:'The common lapse is answering 3 — that is where the minimum occurs, not the minimum itself. The prompt also asks for justification, so a bare answer earns little even when correct.'
}

];

if (typeof window !== 'undefined') { window.SAT_BANK = SAT_BANK; window.SAT_DOMAINS = SAT_DOMAINS; }
