
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.shortcuts import get_object_or_404, redirect, render


@login_required
def profile(request):
    return render(request, 'cabinet/profile.html', {'user': request.user})

@login_required
def requests(request):
    leads = request.user.leads.all().order_by('-created_at')
    return render(request, 'cabinet/requests.html', {'leads': leads})

def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('cabinet:profile')
        else:
            messages.error(request, 'невреный логин или пароль')
    return render(request, 'cabinet/login.html')


def logout_view(request):
    logout(request)
    return redirect('cabinet:login')




