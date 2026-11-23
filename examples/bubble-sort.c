// Exemplu minimal si compilabil pentru exercitiul GitHub Actions.
#include <stdio.h>
#define MAX_LEN 100

static void bubble_sort(int *a, int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (a[j] > a[j + 1]) {
                int tmp = a[j];
                a[j] = a[j + 1];
                a[j + 1] = tmp;
            }
        }
    }
}

int main(void) {
    int n, a[MAX_LEN];
    if (scanf("%d", &n) != 1 || n < 0 || n > MAX_LEN) return 1;
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &a[i]) != 1) return 1;
    }
    bubble_sort(a, n);
    for (int i = 0; i < n; i++) printf("%d%s", a[i], i + 1 < n ? " " : "\n");
    return 0;
}
