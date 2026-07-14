
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.shortcuts import get_object_or_404, redirect, render

#Функция для определение роли пользователя
def get_cabinet_context(user):
    if hasattr(user, 'profile'):

        account_type = user.profile.account_type
    else:
        account_type = 'client_person'
    
    if account_type == 'supplier':
        label = 'Поставщик'
        zone = 'Зона поставщика'
    elif account_type == 'client_person':
        label = 'Физическое лицо'
        zone = 'Клиентская зона'
    elif account_type == 'client_company':
        label = 'Компания'
        zone = 'Клиентская зона'
    else:
        label = 'Физическое лицо'
        zone = 'Клиентская зона'

    
    return {
        'cabinet_account_type': account_type,
        'label': label,
        'zone': zone,
    }

@login_required
def profile(request):
    account_type = get_cabinet_context(request.user)

    return render(request, 'cabinet/profile.html', {
        'user': request.user,
        'cabinet_account_type': account_type['cabinet_account_type'],
        'cabinet_account_label': account_type['label'],
        'cabinet_zone_label': account_type['zone']
        })

@login_required
def requests(request):
    leads = request.user.leads.all().order_by('-created_at')
    account_type = get_cabinet_context(request.user)
    return render(request, 'cabinet/requests.html', {
        'leads': leads,
        'cabinet_account_type': account_type['cabinet_account_type'],
        'cabinet_account_label': account_type['label'],
        'cabinet_zone_label': account_type['zone']
        })

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




