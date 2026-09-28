# States

http://localhost:5751 · 1 states · 2026-09-28T17:26

| State | Device | Capture | Errors | Note |
| --- | --- | --- | --- | --- |
| old-task2 | phone | old-task2-phone.png | 2 | step 1 (tap text=Alerts >> nth=0) changed nothing on screen; step 2 (swipe {"at":"role=cell[name='Bella']","dx":-250,"dy":0}) changed nothing on screen |

## Steps

**old-task2** (phone)

    1. tap text=Alerts >> nth=0 → div "Alerts" 125×14 (no control semantics)
    2. swipe from [188,581] by [-250,0] → on td "Bella" 118×41
    3. swipe from [195,422] by [0,-2500] → on div "Cows milked 40 ↑ 2 Litres this milking 9" 358×346
    4. tap [370,30] → td "Main herd" 153×41 (no control semantics)

