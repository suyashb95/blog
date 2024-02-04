---
title: Optimizing an Arduino LCD Library
date: "2020-05-16T22:40:32.169Z"
template: "post"
draft: false
slug: "optimizing-an-arduino-LCD-library"
category: "Arduino"
tags:
  - "Arduino"
  - "LCD"
  - "Game Of Life"
description: "Conway's game of  life on an Arduino LCD shield"
---

I got my hands on the [HX8347 TFT](https://wiki.seeedstudio.com/2.8inch_TFT_Touch_Shield_v2.0/) touchscreen Arduino shield and couldn't wait to draw some cool patterns on it. I had also recently read about [Conway's Game of Life](https://en.wikipedia.org/wiki/Conway's_Game_of_Life) and the algorithm seemed pretty simple so I decided to draw it on the LCD. Here's the rules for the Game of Life

- Any live cell with fewer than two live neighbours dies, as if by underpopulation.
- Any live cell with two or three live neighbours lives on to the next generation.
- Any live cell with more than three live neighbours dies, as if by overpopulation.
- Any dead cell with exactly three live neighbours becomes a live cell, as if by reproduction.

It doesn't matter what the starting pattern is, the game always ends up in a steady state. There are some specific seed patterns however, that stabilize after many generations. The most famous one of those is the R-Pentomino.

![alt](./r-pentomino.gif)

Enough about the game, let's dive into the code. We'll use two 32 * 31 array of chars to store the current grid state and the next state. A '1' indicates a live cell and '0' indicates a dead one. Let's set up both to be filled with '0's in the beginning. We'll draw the R-Pentomino on the temp grid right after that

```cpp
void init_main_grid() {
    for (uint8_t i=0; i<m; i++)
        for (uint8_t j=0; j<n; j++)
            main_grid[i][j] = '0';
}

void init_temp_grid() {
    for (uint8_t i=0; i<m; i++)
        for (uint8_t j=0; j<n; j++)
            temp_grid[i][j] = '0';
}

void set_r_pentonimo() {
    /*
    The temp grid always contains the next state
    */
    temp_grid[m/2][n/2] = '1';
    temp_grid[m/2][n/2+1] = '1';
    temp_grid[m/2][n/2-1] = '1';
    temp_grid[m/2-1][n/2] = '1';
    temp_grid[m/2+1][n/2+1] = '1';
}

```
Now, in each iteration we need to calculate the next generation of the game. For that we'll have to evaluate the rules of the game for each cell in the main grid to check if it should stay alive.

<img src="https://media.giphy.com/media/ONGk2odfvHphGhSzN0/giphy.gif" alt="stayin-alive"
	style="display: inline-flex" width="320" height="280" />

```cpp
boolean is_valid_index(uint8_t i, uint8_t j) {
    return ((i>0) && (i<m) && (j>0) && (j<n));
}

boolean is_alive(uint8_t i, uint8_t j) {
  return is_valid_index(i, j) && main_grid[i][j] == '1';
}

int get_live_neighbors(uint8_t i, uint8_t j) {
    uint8_t live_neighbors = 0;
    if (is_alive(i-1, j)) live_neighbors += 1;
    if (is_alive(i+1, j)) live_neighbors += 1;
    if (is_alive(i, j-1)) live_neighbors += 1;
    if (is_alive(i, j+1)) live_neighbors += 1;
    if (is_alive(i-1, j-1)) live_neighbors += 1;
    if (is_alive(i-1, j+1)) live_neighbors += 1;
    if (is_alive(i+1, j-1)) live_neighbors += 1;
    if (is_alive(i+1, j+1)) live_neighbors += 1;
    return live_neighbors;
}

boolean should_stay_alive_or_resurrect(uint8_t i, uint8_t j) {
    /*
    Returns a boolean indicating whether or not a cell should be alive in the next generation
    Any live cell with two or three live neighbours lives on to the next generation
    Any dead cell with exactly three live neighbours becomes a live cell, as if by reproduction
    */
    uint8_t live_neighbors = get_live_neighbors(i, j);
    return (is_alive(i, j) && (live_neighbors == 2 || live_neighbors == 3)) || (live_neighbors == 3);
}
```

Next, we just call `should_stay_alive_or_resurrect` for each cell in the main grid and swap the temp and main grids once done

```cpp
void loop() {
    calculate_next_generation();
    render_grid();
}

void calculate_next_generation() {
    for(uint8_t i=0; i<m; i++) {
        for(uint8_t j=0; j<n; j++) {
            temp_grid[i][j] = should_stay_alive_or_resurrect(i, j) ? '1': '0';
        }
    }
}

void render_grid() {
    for (uint8_t i=0; i<m; i++)
        for (uint8_t j=0; j<n; j++) {
            main_grid[i][j] = temp_grid[i][j];
            if(is_alive(i, j))
                Tft.lcd_fill_rect(i*4 + 75, j*4+ 75, 4, 4, RED);
            else
                Tft.lcd_fill_rect(i*4 + 75, j*4+ 75, 4, 4, BLACK);
        }
}

```
![](https://thumbs.gfycat.com/InsidiousHappygoluckyAtlanticsharpnosepuffer-small.gif)

That's it! Well, not really. It does work but it's really slow. It looks more like a slide show than a video. If you look at the `render_grid` function, you'll realize we're re-rendering each cell again. As a minor optimization, we can skip rendering a cell if it hasn't change state between generations. Let's do that

```cpp
void render_grid_fast() {
    for(uint8_t i=0; i<m; i++) {
        for(uint8_t j=0; j<n; j++) {
          boolean was_alive = is_alive(i, j);
          main_grid[i][j] = temp_grid[i][j];
          boolean resurrected = is_alive(i, j);
          if(resurrected && !was_alive)
            Tft.lcd_fill_rect(i*4 + 75, j*4 + 75, 4, 4, RED);
          if (!resurrected && was_alive)
            Tft.lcd_fill_rect(i*4 + 75, j*4 + 75, 4, 4, BLACK);
        }
    }
}
```

![](https://thumbs.gfycat.com/EnchantingEagerLemming-small.gif)

That wasn't so difficult, and it's a visible improvent. It's still a bit slow when the screen fills up with live cells. There are tearing effects too. To optimize it further, we'll have to dig into the TFT library's code to see how it works. Let's find out what the `lcd_fill_rect` function is doing

```cpp
void TFT::lcd_draw_point(uint16_t hwXpos, uint16_t hwYpos, uint16_t hwColor)
{
	if (hwXpos >= LCD_WIDTH || hwYpos >= LCD_HEIGHT) {
		return;
	}

	lcd_set_cursor(hwXpos, hwYpos);
	lcd_write_byte(0x22, LCD_CMD);
    lcd_write_word(hwColor);
}

void TFT::lcd_fill_rect(
    uint16_t hwXpos,  //specify x position.
    uint16_t hwYpos,  //specify y position.
    uint16_t hwWidth, //specify the width of the rectangle.
    uint16_t hwHeight, //specify the height of the rectangle.
    uint16_t hwColor //specify the color of rectangle.
    ) {
	uint16_t i, j;

	if (hwXpos >= LCD_WIDTH || hwYpos >= LCD_HEIGHT) {
		return;
	}

	for(i = 0; i < hwHeight; i ++){
		for(j = 0; j < hwWidth; j ++){
			lcd_draw_point(hwXpos + j, hwYpos + i, hwColor);
		}
	}
}
```
Huh, this looks simple. For each point in the rectange, we set the cursor position and write the color code. At first glance it doesn't seem like there's anything to optimize but, if you take a look at the [data sheet](https://cdn-shop.adafruit.com/datasheets/HX8347-G_DS_T_preliminary_v01_100203.pdf), you'll see there's a window address function that limits the cursor to a specific area on the screen. There's also an address counter register that increments the position of the cursor every time a pixel is written to the screen. The direction in which the cursor's position is updated is decided by the MV, MY and MX registers.

> 5.2 Address Counter (AC) of GRAM </br>
The HX8347-G contains an address counter (AC) which assigns address for
writing/reading pixel data to/from GRAM. The address pointers set the position of
GRAM. Every time when a pixel data is written into the GRAM, the X address or Y
address of AC will be automatically increased by 1 (or decreased by 1), which is
decided by the register (MV, MX and MY bits) setting.
To simplify the address control of GRAM access, the window address function allows
for writing data only to a window area of GRAM specified by registers. After data
being written to the GRAM, the AC will be increased or decreased within setting
window address-range which is specified by the (start: SC, end: EC) and the (start:
SP, end: EP). Therefore, the data can be written consecutively without thinking about
wrapping around

This means we can fill a rectangle on the screen without worrying about setting the cursor position each time. Convenient! Let's write new methods to do this. We'll call them `lcd_set_area` and `lcd_fill_rect_fast`

```cpp
void lcd_set_area(uint16_t hwXpos, uint16_t hwYpos, uint16_t hwXend, uint16_t hwYend) {

	lcd_write_register(0x02, hwXpos >> 8);
	lcd_write_register(0x03, hwXpos & 0xFF);

	lcd_write_register(0x04, hwXend >> 8);
	lcd_write_register(0x05, hwXend & 0xFF);

	lcd_write_register(0x06, hwYpos >> 8);
	lcd_write_register(0x07, hwYpos & 0xFF);

	lcd_write_register(0x08, hwYend >> 8);
	lcd_write_register(0x09, hwYend & 0xFF);
}

void TFT::lcd_fill_rect_fast(
    uint16_t hwXpos,  //specify x position.
    uint16_t hwYpos,  //specify y position.
    uint16_t hwWidth, //specify the width of the rectangle.
    uint16_t hwHeight, //specify the height of the rectangle.
    uint16_t hwColor //specify the color of rectangle.
    )  {
	if (hwXpos > LCD_WIDTH || hwYpos > LCD_HEIGHT) {
		return;
	}

	uint32_t i, wCount = hwWidth;
	wCount *= hwHeight;

	lcd_set_cursor(hwXpos, hwYpos);
	lcd_set_area(hwXpos, hwYpos, hwXpos + hwWidth - 1, hwYpos + hwHeight - 1);

	lcd_write_byte(0x22, LCD_CMD);

	__LCD_DC_SET();
	__LCD_CS_CLR();

	for(i = 0; i < wCount; i++) {
		__LCD_WRITE_WORD(hwColor);
	}
	__LCD_CS_SET();

	lcd_set_area(0, 0, LCD_WIDTH, LCD_HEIGHT);
}
```

Neat! We don't have to keep setting the cursor position for each pixel in the rectangle. Let's see exactly how fast this is.

![](https://thumbs.gfycat.com/FamousCourteousGermanshepherd-small.gif)

No more screen tearing! The optmized code reaches a steady state in 10 seconds (that's almost half the time the older version takes). The entire script can be found [here](https://github.com/suyashb95/MCUProjects/blob/master/LCD Projects/gameoflife/gameoflife.ino)